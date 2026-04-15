package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kinktube/internal/models"
)

func scanVideoRow(rows pgx.Rows, v *models.Video) error {
	return rows.Scan(
		&v.ID, &v.ExternalID, &v.Title, &v.Description,
		&v.Duration, &v.DurationStr, &v.Views, &v.Rating,
		&v.Thumbnail, &v.ThumbnailLg, &v.EmbedURL, &v.SourceURL,
		&v.Tags, &v.Categories, &v.Keywords, &v.AddedAt,
		&v.PublishedAt, &v.LastUpdatedAt,
	)
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

		ALTER TABLE category_menu_thumbnails
		ADD COLUMN IF NOT EXISTS query_key TEXT NOT NULL DEFAULT '';
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

// UpsertVideo inserts or updates a video (handles deduplication by external_id).
func (db *PostgresDB) UpsertVideo(ctx context.Context, video *models.Video) (bool, error) {
	query := `
		INSERT INTO videos (
			external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, published_at, last_updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
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
			tags = EXCLUDED.tags,
			categories = EXCLUDED.categories,
			keywords = EXCLUDED.keywords,
			published_at = EXCLUDED.published_at,
			last_updated_at = NOW()
		RETURNING id, added_at, (xmax = 0) AS inserted
	`

	var inserted bool
	err := db.pool.QueryRow(ctx, query,
		video.ExternalID, video.Title, video.Description, video.Duration, video.DurationStr,
		video.Views, video.Rating, video.Thumbnail, video.ThumbnailLg, video.EmbedURL,
		video.SourceURL, video.Tags, video.Categories, video.Keywords, video.PublishedAt,
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
	err := db.pool.QueryRow(ctx, query, id).Scan(
		&video.ID, &video.ExternalID, &video.Title, &video.Description,
		&video.Duration, &video.DurationStr, &video.Views, &video.Rating,
		&video.Thumbnail, &video.ThumbnailLg, &video.EmbedURL, &video.SourceURL,
		&video.Tags, &video.Categories, &video.Keywords, &video.AddedAt,
		&video.PublishedAt, &video.LastUpdatedAt,
	)

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
	err := db.pool.QueryRow(ctx, query, externalID).Scan(
		&video.ID, &video.ExternalID, &video.Title, &video.Description,
		&video.Duration, &video.DurationStr, &video.Views, &video.Rating,
		&video.Thumbnail, &video.ThumbnailLg, &video.EmbedURL, &video.SourceURL,
		&video.Tags, &video.Categories, &video.Keywords, &video.AddedAt,
		&video.PublishedAt, &video.LastUpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return video, nil
}

// ListVideos retrieves videos with pagination and optional filtering
func (db *PostgresDB) ListVideos(ctx context.Context, page, perPage int, sortBy, category, search string) (*models.VideoListResponse, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 24
	}

	offset := (page - 1) * perPage

	// Build WHERE clause
	var conditions []string
	var args []interface{}
	argIndex := 1

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
	switch sortBy {
	case "views":
		orderClause = "ORDER BY views DESC, rating DESC"
	case "rating":
		orderClause = "ORDER BY rating DESC, views DESC"
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

	// Count total before language filtering. Page contents are filtered again below.
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

			if !models.IsLikelyEnglishVideo(&v) {
				continue
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
	}, nil
}

// GetCategoryStats returns video counts for each category
func (db *PostgresDB) GetCategoryStats(ctx context.Context) (map[string]int64, error) {
	query := `
		SELECT unnest(categories) as category, COUNT(*) as count
		FROM videos
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
	err := db.pool.QueryRow(ctx, "SELECT COUNT(*) FROM videos").Scan(&count)
	return count, err
}

// GetRelatedVideos fetches videos related by category or tags
// Prioritizes videos that share the FIRST (primary) category and specific keywords
func (db *PostgresDB) GetRelatedVideos(ctx context.Context, videoID int64, limit int) ([]models.Video, error) {
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
		LIMIT $2
	`

	rows, err := db.pool.Query(ctx, query, videoID, rawLimit)
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

		if !models.IsLikelyEnglishVideo(&v) {
			continue
		}

		videos = append(videos, v)
		if len(videos) >= limit {
			break
		}
	}

	return videos, nil
}
