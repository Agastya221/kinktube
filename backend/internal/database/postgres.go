package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kinktube/internal/models"
)

const defaultListPerPage = 24

type rowScanner interface {
	Scan(dest ...any) error
}

func scanVideoRow(row rowScanner, v *models.Video) error {
	var description sql.NullString
	var durationStr sql.NullString
	var thumbnailLg sql.NullString
	var sourceURL sql.NullString
	var keywords sql.NullString
	var publishedAt sql.NullTime

	if err := row.Scan(
		&v.ID, &v.ExternalID, &v.Title, &description,
		&v.Duration, &durationStr, &v.Views, &v.Rating,
		&v.Thumbnail, &thumbnailLg, &v.EmbedURL, &sourceURL,
		&v.Tags, &v.Categories, &keywords, &v.AddedAt,
		&publishedAt, &v.LastUpdatedAt,
	); err != nil {
		return err
	}

	v.Description = nullString(description)
	v.DurationStr = nullString(durationStr)
	v.ThumbnailLg = nullString(thumbnailLg)
	v.SourceURL = nullString(sourceURL)
	v.Keywords = nullString(keywords)
	if publishedAt.Valid {
		v.PublishedAt = publishedAt.Time
	} else {
		v.PublishedAt = time.Time{}
	}

	return nil
}

func nullString(value sql.NullString) string {
	if value.Valid {
		return value.String
	}
	return ""
}

// PostgresDB wraps the connection pool
type PostgresDB struct {
	pool *pgxpool.Pool
}

// CategoryMenuThumbnailCache stores the persisted thumbnail plus the query strategy that produced it.
type CategoryMenuThumbnailCache struct {
	Thumbnail string
	QueryKey  string
}

// NewPostgresDB creates a new database connection pool
func NewPostgresDB(ctx context.Context, databaseURL string) (*PostgresDB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Connection pool settings for high traffic
	config.MaxConns = 50
	config.MinConns = 10
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresDB{pool: pool}, nil
}

// Close closes the database connection pool
func (db *PostgresDB) Close() {
	db.pool.Close()
}

// InitSchema creates the database tables if they don't exist
func (db *PostgresDB) InitSchema(ctx context.Context) error {
	schema := `
		CREATE TABLE IF NOT EXISTS videos (
			id BIGSERIAL PRIMARY KEY,
			external_id VARCHAR(64) UNIQUE NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			duration INTEGER NOT NULL DEFAULT 0,
			duration_str VARCHAR(16),
			views BIGINT NOT NULL DEFAULT 0,
			rating DECIMAL(3,2) NOT NULL DEFAULT 0,
			thumbnail TEXT NOT NULL,
			thumbnail_lg TEXT,
			embed_url TEXT NOT NULL,
			source_url TEXT,
			tags TEXT[] DEFAULT '{}',
			categories TEXT[] DEFAULT '{}',
			keywords VARCHAR(128),
			added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			published_at TIMESTAMP WITH TIME ZONE,
			last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		-- Indexes for common queries
		CREATE INDEX IF NOT EXISTS idx_videos_added_at ON videos(added_at DESC);
		CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
		CREATE INDEX IF NOT EXISTS idx_videos_rating ON videos(rating DESC);
		CREATE INDEX IF NOT EXISTS idx_videos_keywords ON videos(keywords);
		CREATE INDEX IF NOT EXISTS idx_videos_categories ON videos USING GIN(categories);
		CREATE INDEX IF NOT EXISTS idx_videos_tags ON videos USING GIN(tags);

		-- Full text search index
		CREATE INDEX IF NOT EXISTS idx_videos_title_search ON videos USING GIN(to_tsvector('english', title));

		CREATE TABLE IF NOT EXISTS category_menu_thumbnails (
			slug VARCHAR(64) PRIMARY KEY,
			thumbnail TEXT NOT NULL,
			query_key TEXT NOT NULL DEFAULT '',
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS site_settings (
			id SMALLINT PRIMARY KEY CHECK (id = 1),
			data JSONB NOT NULL DEFAULT '{}'::jsonb,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS contact_submissions (
			id BIGSERIAL PRIMARY KEY,
			type VARCHAR(32) NOT NULL DEFAULT 'content_removal',
			name VARCHAR(120) NOT NULL DEFAULT '',
			reply_to VARCHAR(200) NOT NULL DEFAULT '',
			page_url TEXT NOT NULL DEFAULT '',
			source_url TEXT NOT NULL DEFAULT '',
			subject VARCHAR(160) NOT NULL DEFAULT '',
			message TEXT NOT NULL,
			status VARCHAR(32) NOT NULL DEFAULT 'new',
			ip_address TEXT NOT NULL DEFAULT '',
			user_agent TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);

		ALTER TABLE category_menu_thumbnails
		ADD COLUMN IF NOT EXISTS query_key TEXT NOT NULL DEFAULT '';

		ALTER TABLE videos
		ADD COLUMN IF NOT EXISTS is_english BOOLEAN NOT NULL DEFAULT TRUE;

		ALTER TABLE videos
		ADD COLUMN IF NOT EXISTS language_checked BOOLEAN NOT NULL DEFAULT FALSE;

		CREATE INDEX IF NOT EXISTS idx_videos_is_english ON videos(is_english);

		ALTER TABLE videos
		ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

		CREATE INDEX IF NOT EXISTS idx_videos_is_available ON videos(is_available);

		CREATE TABLE IF NOT EXISTS video_comments (
			id BIGSERIAL PRIMARY KEY,
			video_id BIGINT NOT NULL,
			name VARCHAR(120) NOT NULL DEFAULT 'Anonymous',
			content TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);

		CREATE TABLE IF NOT EXISTS ai_seo_logs (
			id BIGSERIAL PRIMARY KEY,
			video_id BIGINT NOT NULL,
			video_title TEXT NOT NULL DEFAULT '',
			status VARCHAR(16) NOT NULL DEFAULT 'updated',
			old_description TEXT NOT NULL DEFAULT '',
			new_description TEXT NOT NULL DEFAULT '',
			safety_notes TEXT NOT NULL DEFAULT '',
			tokens_used INTEGER NOT NULL DEFAULT 0,
			processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_ai_seo_logs_processed_at ON ai_seo_logs(processed_at DESC);
		CREATE INDEX IF NOT EXISTS idx_ai_seo_logs_status ON ai_seo_logs(status);
		CREATE INDEX IF NOT EXISTS idx_ai_seo_logs_video_id ON ai_seo_logs(video_id);
	`

	_, err := db.pool.Exec(ctx, schema)
	return err
}

// GetCategoryMenuThumbnailMap returns cached menu thumbnails by category slug.
func (db *PostgresDB) GetCategoryMenuThumbnailMap(ctx context.Context, slugs []string) (map[string]CategoryMenuThumbnailCache, error) {
	if len(slugs) == 0 {
		return map[string]CategoryMenuThumbnailCache{}, nil
	}

	query := `
		SELECT slug, thumbnail, query_key
		FROM category_menu_thumbnails
		WHERE slug = ANY($1)
	`

	rows, err := db.pool.Query(ctx, query, slugs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	thumbnails := make(map[string]CategoryMenuThumbnailCache, len(slugs))
	for rows.Next() {
		var slug string
		var thumbnail string
		var queryKey string
		if err := rows.Scan(&slug, &thumbnail, &queryKey); err != nil {
			return nil, err
		}
		thumbnails[slug] = CategoryMenuThumbnailCache{
			Thumbnail: thumbnail,
			QueryKey:  queryKey,
		}
	}

	return thumbnails, rows.Err()
}

// UpsertCategoryMenuThumbnail stores or refreshes a cached menu thumbnail.
func (db *PostgresDB) UpsertCategoryMenuThumbnail(ctx context.Context, slug, queryKey, thumbnail string) error {
	if slug == "" || thumbnail == "" {
		return nil
	}

	query := `
		INSERT INTO category_menu_thumbnails (slug, thumbnail, query_key, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (slug) DO UPDATE SET
			thumbnail = EXCLUDED.thumbnail,
			query_key = EXCLUDED.query_key,
			updated_at = NOW()
	`

	_, err := db.pool.Exec(ctx, query, slug, thumbnail, queryKey)
	return err
}

// ClearCategoryMenuThumbnailCache removes cached menu thumbnails so they can be refreshed.
func (db *PostgresDB) ClearCategoryMenuThumbnailCache(ctx context.Context) error {
	_, err := db.pool.Exec(ctx, "DELETE FROM category_menu_thumbnails")
	return err
}

// BackfillEnglishFlags evaluates existing rows with the current language heuristic so
// counts and list filters stay accurate for already-imported content.
func (db *PostgresDB) BackfillEnglishFlags(ctx context.Context, batchSize int) (int64, error) {
	if batchSize < 1 {
		batchSize = 500
	}

	var totalUpdated int64

	for {
		rows, err := db.pool.Query(ctx, `
			SELECT id, title, tags, keywords
			FROM videos
			WHERE language_checked = FALSE
			ORDER BY id
			LIMIT $1
		`, batchSize)
		if err != nil {
			return totalUpdated, err
		}

		type visibilityUpdate struct {
			id        int64
			isEnglish bool
		}

		updates := make([]visibilityUpdate, 0, batchSize)
		for rows.Next() {
			var id int64
			var title string
			var tags []string
			var keywords string
			if err := rows.Scan(&id, &title, &tags, &keywords); err != nil {
				rows.Close()
				return totalUpdated, err
			}

			updates = append(updates, visibilityUpdate{
				id: id,
				isEnglish: models.IsLikelyEnglishText(
					title,
					strings.Join(tags, " "),
					keywords,
				),
			})
		}

		if err := rows.Err(); err != nil {
			rows.Close()
			return totalUpdated, err
		}
		rows.Close()

		if len(updates) == 0 {
			return totalUpdated, nil
		}

		batch := &pgx.Batch{}
		for _, update := range updates {
			batch.Queue(`
				UPDATE videos
				SET is_english = $1, language_checked = TRUE
				WHERE id = $2
			`, update.isEnglish, update.id)
		}

		results := db.pool.SendBatch(ctx, batch)
		for range updates {
			if _, err := results.Exec(); err != nil {
				_ = results.Close()
				return totalUpdated, err
			}
		}
		if err := results.Close(); err != nil {
			return totalUpdated, err
		}

		totalUpdated += int64(len(updates))
	}
}

// UpsertVideo inserts or updates a video (handles deduplication by external_id).
func (db *PostgresDB) UpsertVideo(ctx context.Context, video *models.Video) (bool, error) {
	isEnglish := models.IsLikelyEnglishVideo(video)

	query := `
		INSERT INTO videos (
			external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, published_at, is_english, language_checked, last_updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE, NOW()
		)
		ON CONFLICT (external_id) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			duration = EXCLUDED.duration,
			duration_str = EXCLUDED.duration_str,
			views = EXCLUDED.views,
			rating = EXCLUDED.rating,
			thumbnail = EXCLUDED.thumbnail,
			thumbnail_lg = EXCLUDED.thumbnail_lg,
			embed_url = EXCLUDED.embed_url,
			source_url = EXCLUDED.source_url,
			tags = ARRAY(
				SELECT merged_tag.tag
				FROM (
					SELECT tag, MIN(ord) AS ord
					FROM unnest(EXCLUDED.tags || videos.tags) WITH ORDINALITY AS merged(tag, ord)
					WHERE tag IS NOT NULL AND tag <> ''
					GROUP BY tag
					ORDER BY MIN(ord)
					LIMIT 32
				) AS merged_tag
			),
			categories = ARRAY(
				SELECT merged_category.category
				FROM (
					SELECT category, MIN(ord) AS ord
					FROM unnest(EXCLUDED.categories || videos.categories) WITH ORDINALITY AS merged(category, ord)
					WHERE category IS NOT NULL AND category <> ''
					GROUP BY category
					ORDER BY MIN(ord)
				) AS merged_category
			),
			keywords = EXCLUDED.keywords,
			published_at = EXCLUDED.published_at,
			is_english = EXCLUDED.is_english,
			language_checked = TRUE,
			last_updated_at = NOW()
		RETURNING id, added_at, (xmax = 0) AS inserted
	`

	var inserted bool
	err := db.pool.QueryRow(ctx, query,
		video.ExternalID, video.Title, video.Description, video.Duration, video.DurationStr,
		video.Views, video.Rating, video.Thumbnail, video.ThumbnailLg, video.EmbedURL,
		video.SourceURL, video.Tags, video.Categories, video.Keywords, video.PublishedAt, isEnglish,
	).Scan(&video.ID, &video.AddedAt, &inserted)
	if err != nil {
		return false, err
	}

	return inserted, nil
}

// GetVideoByID retrieves a video by its internal ID
func (db *PostgresDB) GetVideoByID(ctx context.Context, id int64) (*models.Video, error) {
	query := `
		SELECT id, external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, added_at, published_at, last_updated_at
		FROM videos WHERE id = $1
	`

	video := &models.Video{}
	err := scanVideoRow(db.pool.QueryRow(ctx, query, id), video)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return video, nil
}

// GetVideoByExternalID retrieves a video by its Eporner ID
func (db *PostgresDB) GetVideoByExternalID(ctx context.Context, externalID string) (*models.Video, error) {
	query := `
		SELECT id, external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, added_at, published_at, last_updated_at
		FROM videos WHERE external_id = $1
	`

	video := &models.Video{}
	err := scanVideoRow(db.pool.QueryRow(ctx, query, externalID), video)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return video, nil
}

// UpdateVideoDescription stores a generated SEO description for an existing video.
func (db *PostgresDB) UpdateVideoDescription(ctx context.Context, id int64, description string) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE videos SET description = $1, last_updated_at = NOW() WHERE id = $2`,
		description,
		id,
	)
	return err
}

// ListVideosMissingDescriptions returns visible videos that still need cached AI SEO text.
// It excludes videos that have already been rejected by the AI pipeline to avoid infinite retry loops.
func (db *PostgresDB) ListVideosMissingDescriptions(ctx context.Context, limit int) ([]models.Video, error) {
	if limit < 1 {
		limit = 25
	}
	if limit > 500 {
		limit = 500
	}

	rows, err := db.pool.Query(ctx, `
		SELECT id, external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, added_at, published_at, last_updated_at
		FROM videos
		WHERE is_english = TRUE
		AND is_available = TRUE
		AND (description IS NULL OR btrim(description) = '')
		AND id NOT IN (
			SELECT DISTINCT video_id FROM ai_seo_logs WHERE status = 'rejected'
		)
		ORDER BY added_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	videos := make([]models.Video, 0, limit)
	for rows.Next() {
		var video models.Video
		if err := scanVideoRow(rows, &video); err != nil {
			return nil, err
		}
		videos = append(videos, video)
	}

	return videos, rows.Err()
}

// ListVideos retrieves videos with pagination and optional filtering
func (db *PostgresDB) ListVideos(ctx context.Context, page, perPage int, sortBy, category, search string) (*models.VideoListResponse, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = defaultListPerPage
	}

	offset := (page - 1) * perPage

	// Build WHERE clause
	var conditions []string
	var args []interface{}
	argIndex := 1

	conditions = append(conditions, "is_english = TRUE")
	conditions = append(conditions, "is_available = TRUE")

	if category != "" {
		// Category must be present in the categories array
		conditions = append(conditions, fmt.Sprintf("$%d = ANY(categories)", argIndex))
		args = append(args, category)
		argIndex++
	}

	if search != "" {
		// Search in title, tags, keywords, and categories for comprehensive BDSM content discovery
		conditions = append(conditions, fmt.Sprintf(
			"(to_tsvector('english', title || ' ' || array_to_string(tags, ' ') || ' ' || COALESCE(keywords, '') || ' ' || array_to_string(categories, ' ')) @@ websearch_to_tsquery('english', $%d))",
			argIndex))
		args = append(args, search)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Priority categories for homepage mixing
	priorityCategories := []string{
		"extreme-bondage", "bondage", "slave", "submission",
		"dominatrix", "shibari", "medical-bondage", "latex", "pet-play", "femdom",
	}

	// Determine sort order
	orderClause := "ORDER BY added_at DESC"

	// BDSM relevance score: rewards videos with multiple strong BDSM category signals
	bdsmRelevanceSQL := `(
			CASE WHEN 'femdom' = ANY(categories) OR 'dominatrix' = ANY(categories) THEN 3 ELSE 0 END +
			CASE WHEN 'bondage' = ANY(categories) OR 'shibari' = ANY(categories) OR 'extreme-bondage' = ANY(categories) THEN 3 ELSE 0 END +
			CASE WHEN 'bdsm' = ANY(categories) THEN 1 ELSE 0 END +
			CASE WHEN 'slave' = ANY(categories) OR 'submission' = ANY(categories) THEN 2 ELSE 0 END +
			CASE WHEN 'latex' = ANY(categories) OR 'leather' = ANY(categories) THEN 2 ELSE 0 END +
			CASE WHEN 'spanking' = ANY(categories) OR 'caning' = ANY(categories) OR 'whipping' = ANY(categories) THEN 2 ELSE 0 END +
			CASE WHEN cardinality(categories) >= 2 THEN 1 ELSE 0 END
		)`

	switch sortBy {
	case "views":
		// Blend relevance with view count so non-BDSM viral videos don't dominate
		orderClause = fmt.Sprintf(`ORDER BY
			%s DESC,
			views DESC,
			rating DESC`, bdsmRelevanceSQL)
	case "rating":
		orderClause = fmt.Sprintf(`ORDER BY
			%s DESC,
			rating DESC,
			views DESC`, bdsmRelevanceSQL)
	case "duration":
		orderClause = "ORDER BY duration DESC"
	case "oldest":
		orderClause = "ORDER BY published_at ASC"
	case "extreme":
		// Prioritize videos with extreme/intense keywords in title
		orderClause = `ORDER BY
			(CASE WHEN lower(title) ~* 'extreme|severe|brutal|intense|harsh|strict|cruel|torture|punishment' THEN 3 ELSE 0 END +
			 CASE WHEN lower(title) ~* 'tight|heavy|hard|discipline|predicament|inescapable|mummification' THEN 2 ELSE 0 END +
			 CASE WHEN cardinality(categories) >= 3 THEN 1 ELSE 0 END) DESC,
			rating DESC,
			views DESC`
	}

	// Homepage: Mix priority categories with rating-based ordering
	if category == "" && search == "" && sortBy == "latest" {
		// Build priority category case for mixing
		priorityCaseSQL := "CASE "
		for i, cat := range priorityCategories {
			priorityCaseSQL += fmt.Sprintf("WHEN '%s' = ANY(categories) THEN %d ", cat, i)
		}
		priorityCaseSQL += "ELSE 100 END"

		orderClause = fmt.Sprintf(`ORDER BY
			%s,
			CASE WHEN cardinality(categories) = 1 AND 'bdsm' = ANY(categories) THEN 1 ELSE 0 END,
			rating DESC,
			views DESC`, priorityCaseSQL)
	}

	// Category pages: default to rating (top-rated) not latest
	if category != "" && sortBy == "latest" {
		orderClause = `ORDER BY
			CASE WHEN categories[1] = $1 THEN 0 ELSE 1 END,
			CASE WHEN keywords ILIKE '%' || $1 || '%' THEN 0 ELSE 1 END,
			rating DESC,
			views DESC`
	}

	// Count exact total using the same visibility filter as the page query.
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM videos %s", whereClause)
	var total int64
	err := db.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id, external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, added_at, published_at, last_updated_at
		FROM videos %s %s LIMIT $%d OFFSET $%d
	`, whereClause, orderClause, argIndex, argIndex+1)

	var videos []models.Video
	batchLimit := perPage * 2
	if batchLimit < 24 {
		batchLimit = 24
	}
	maxBatches := 4
	currentOffset := offset

	for batch := 0; batch < maxBatches && len(videos) < perPage; batch++ {
		batchArgs := append(append([]interface{}{}, args...), batchLimit, currentOffset)
		rows, err := db.pool.Query(ctx, query, batchArgs...)
		if err != nil {
			return nil, err
		}

		rawCount := 0
		for rows.Next() {
			rawCount++

			var v models.Video
			if err := scanVideoRow(rows, &v); err != nil {
				rows.Close()
				return nil, err
			}

			videos = append(videos, v)
			if len(videos) >= perPage {
				break
			}
		}

		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, err
		}
		rows.Close()

		if rawCount < batchLimit {
			break
		}

		currentOffset += batchLimit
	}

	if videos == nil {
		videos = []models.Video{}
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	return &models.VideoListResponse{
		Videos:     videos,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
		HasMore:    page < totalPages,
		TotalExact: true,
	}, nil
}

// GetCategoryStats returns video counts for each category
func (db *PostgresDB) GetCategoryStats(ctx context.Context) (map[string]int64, error) {
	query := `
		SELECT unnest(categories) as category, COUNT(*) as count
		FROM videos
		WHERE is_english = TRUE
		GROUP BY category
		ORDER BY count DESC
	`

	rows, err := db.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := make(map[string]int64)
	for rows.Next() {
		var cat string
		var count int64
		if err := rows.Scan(&cat, &count); err != nil {
			return nil, err
		}
		stats[cat] = count
	}

	return stats, nil
}

// GetTotalVideoCount returns the total number of videos
func (db *PostgresDB) GetTotalVideoCount(ctx context.Context) (int64, error) {
	var count int64
	err := db.pool.QueryRow(ctx, "SELECT COUNT(*) FROM videos WHERE is_english = TRUE").Scan(&count)
	return count, err
}

// GetRelatedVideos fetches videos related by category or tags
// Prioritizes videos that share the FIRST (primary) category and specific keywords
func (db *PostgresDB) GetRelatedVideos(ctx context.Context, videoID int64, page, limit int) ([]models.Video, error) {
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit
	rawLimit := limit * 3
	if rawLimit < 12 {
		rawLimit = 12
	}

	query := `
		WITH target AS (
			SELECT
				categories,
				tags,
				keywords,
				COALESCE(categories[1], 'bdsm') as primary_category
			FROM videos WHERE id = $1
		)
		SELECT v.id, v.external_id, v.title, v.description, v.duration, v.duration_str,
			v.views, v.rating, v.thumbnail, v.thumbnail_lg, v.embed_url, v.source_url,
			v.tags, v.categories, v.keywords, v.added_at, v.published_at, v.last_updated_at
		FROM videos v, target t
		WHERE v.id != $1
		AND v.is_english = TRUE
		AND (
			-- Must share primary category OR have same keywords
			t.primary_category = ANY(v.categories)
			OR v.keywords = t.keywords
		)
		ORDER BY
			-- Highest priority: same keywords (imported from same search)
			CASE WHEN v.keywords = t.keywords THEN 10 ELSE 0 END +
			-- High priority: shares primary category
			CASE WHEN t.primary_category = ANY(v.categories) THEN 5 ELSE 0 END +
			-- Medium priority: number of matching categories (excluding generic 'bdsm')
			(SELECT COUNT(*) FROM unnest(v.categories) c
			 WHERE c = ANY(t.categories) AND c != 'bdsm') +
			-- Lower priority: matching tags
			(SELECT COUNT(*) FROM unnest(v.tags) tag WHERE tag = ANY(t.tags)) * 0.5
		DESC,
		v.rating DESC,
		v.views DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := db.pool.Query(ctx, query, videoID, rawLimit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []models.Video
	for rows.Next() {
		var v models.Video
		if err := scanVideoRow(rows, &v); err != nil {
			return nil, err
		}

		videos = append(videos, v)
		if len(videos) >= limit {
			break
		}
	}

	return videos, nil
}

// MarkVideoUnavailable flags a video as unavailable so it is hidden from listings.
// Called when the frontend detects the embed returns "Video Unavailable".
func (db *PostgresDB) MarkVideoUnavailable(ctx context.Context, videoID int64) error {
	_, err := db.pool.Exec(ctx,
		`UPDATE videos SET is_available = FALSE, last_updated_at = NOW() WHERE id = $1`,
		videoID,
	)
	return err
}

// DeleteUnavailableVideos permanently removes all videos flagged as unavailable.
// Can be run periodically as a maintenance task.
func (db *PostgresDB) DeleteUnavailableVideos(ctx context.Context) (int64, error) {
	result, err := db.pool.Exec(ctx,
		`DELETE FROM videos WHERE is_available = FALSE`,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// VideoIDPair is a minimal row used by the dead-video cleanup scanner.
type VideoIDPair struct {
	ID         int64
	ExternalID string
}

// ListVideosForValidation returns a paginated list of (id, external_id) for all
// currently-available videos so the cleanup scanner can verify them against Eporner.
func (db *PostgresDB) ListVideosForValidation(ctx context.Context, page, pageSize int) ([]VideoIDPair, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	rows, err := db.pool.Query(ctx,
		`SELECT id, external_id FROM videos WHERE is_available = TRUE ORDER BY id LIMIT $1 OFFSET $2`,
		pageSize, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pairs []VideoIDPair
	for rows.Next() {
		var p VideoIDPair
		if err := rows.Scan(&p.ID, &p.ExternalID); err != nil {
			return nil, err
		}
		pairs = append(pairs, p)
	}
	return pairs, rows.Err()
}

// VideoComment represents a user comment on a video
type VideoComment struct {
	ID        int64     `json:"id"`
	VideoID   int64     `json:"video_id"`
	Name      string    `json:"name"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

// GetVideoComments fetches comments for a video, ordered by newest first
func (db *PostgresDB) GetVideoComments(ctx context.Context, videoID int64, limit int) ([]VideoComment, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := db.pool.Query(ctx,
		`SELECT id, video_id, name, content, created_at 
		 FROM video_comments 
		 WHERE video_id = $1 
		 ORDER BY created_at DESC 
		 LIMIT $2`,
		videoID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []VideoComment
	for rows.Next() {
		var c VideoComment
		if err := rows.Scan(&c.ID, &c.VideoID, &c.Name, &c.Content, &c.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

// AddVideoComment inserts a new comment
func (db *PostgresDB) AddVideoComment(ctx context.Context, c *VideoComment) error {
	return db.pool.QueryRow(ctx,
		`INSERT INTO video_comments (video_id, name, content) 
		 VALUES ($1, $2, $3) 
		 RETURNING id, created_at`,
		c.VideoID, c.Name, c.Content,
	).Scan(&c.ID, &c.CreatedAt)
}

// AISEOLog represents a single AI SEO processing record.
type AISEOLog struct {
	ID             int64     `json:"id"`
	VideoID        int64     `json:"video_id"`
	VideoTitle     string    `json:"video_title"`
	Status         string    `json:"status"` // "updated", "rejected", "error"
	OldDescription string    `json:"old_description"`
	NewDescription string    `json:"new_description"`
	SafetyNotes    string    `json:"safety_notes"`
	TokensUsed     int       `json:"tokens_used"`
	ProcessedAt    time.Time `json:"processed_at"`
}

// InsertAISEOLog records a single AI SEO processing event.
func (db *PostgresDB) InsertAISEOLog(ctx context.Context, log *AISEOLog) error {
	return db.pool.QueryRow(ctx,
		`INSERT INTO ai_seo_logs (video_id, video_title, status, old_description, new_description, safety_notes, tokens_used)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, processed_at`,
		log.VideoID, log.VideoTitle, log.Status, log.OldDescription, log.NewDescription, log.SafetyNotes, log.TokensUsed,
	).Scan(&log.ID, &log.ProcessedAt)
}

// ListAISEOLogs returns paginated AI SEO logs, newest first. Filter by status if non-empty.
func (db *PostgresDB) ListAISEOLogs(ctx context.Context, status string, page, perPage int) ([]AISEOLog, int, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 50
	}
	if perPage > 200 {
		perPage = 200
	}
	offset := (page - 1) * perPage

	// Count total
	var total int
	countQuery := `SELECT COUNT(*) FROM ai_seo_logs`
	if status != "" {
		countQuery += ` WHERE status = $1`
		err := db.pool.QueryRow(ctx, countQuery, status).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
	} else {
		err := db.pool.QueryRow(ctx, countQuery).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
	}

	// Fetch page
	var rows pgx.Rows
	var err error
	if status != "" {
		rows, err = db.pool.Query(ctx,
			`SELECT id, video_id, video_title, status, old_description, new_description, safety_notes, tokens_used, processed_at
			 FROM ai_seo_logs WHERE status = $1 ORDER BY processed_at DESC LIMIT $2 OFFSET $3`,
			status, perPage, offset)
	} else {
		rows, err = db.pool.Query(ctx,
			`SELECT id, video_id, video_title, status, old_description, new_description, safety_notes, tokens_used, processed_at
			 FROM ai_seo_logs ORDER BY processed_at DESC LIMIT $1 OFFSET $2`,
			perPage, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := make([]AISEOLog, 0, perPage)
	for rows.Next() {
		var l AISEOLog
		if err := rows.Scan(&l.ID, &l.VideoID, &l.VideoTitle, &l.Status, &l.OldDescription, &l.NewDescription, &l.SafetyNotes, &l.TokensUsed, &l.ProcessedAt); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}

	return logs, total, rows.Err()
}

// GetAISEOLogStats returns aggregate counts for the AI SEO log table.
func (db *PostgresDB) GetAISEOLogStats(ctx context.Context) (total int, updated int, rejected int, errored int, err error) {
	err = db.pool.QueryRow(ctx,
		`SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'updated'),
			COUNT(*) FILTER (WHERE status = 'rejected'),
			COUNT(*) FILTER (WHERE status = 'error')
		 FROM ai_seo_logs`,
	).Scan(&total, &updated, &rejected, &errored)
	return
}

// ResetAISEO reverts AI generated descriptions and deletes AI SEO logs.
// If all is true, it resets everything. If false, it only resets logs from the current UTC day.
func (db *PostgresDB) ResetAISEO(ctx context.Context, all bool) (int, error) {
	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	timeCondition := ""
	if !all {
		timeCondition = "AND processed_at >= CURRENT_DATE"
	}

	// First, update videos back to old description (NULL if it was empty, but our DB is TEXT so empty string is fine)
	updateQuery := fmt.Sprintf(`
		UPDATE videos v
		SET description = NULLIF(a.old_description, ''), last_updated_at = NOW()
		FROM ai_seo_logs a
		WHERE v.id = a.video_id AND a.status = 'updated' %s
	`, timeCondition)

	if _, err := tx.Exec(ctx, updateQuery); err != nil {
		return 0, err
	}

	// Then, delete the logs
	deleteQuery := fmt.Sprintf(`
		DELETE FROM ai_seo_logs WHERE 1=1 %s
	`, timeCondition)

	tag, err := tx.Exec(ctx, deleteQuery)
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return int(tag.RowsAffected()), nil
}
