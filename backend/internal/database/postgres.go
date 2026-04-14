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

// PostgresDB wraps the connection pool
type PostgresDB struct {
	pool *pgxpool.Pool
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
	`

	_, err := db.pool.Exec(ctx, schema)
	return err
}

// UpsertVideo inserts or updates a video (handles deduplication by external_id)
func (db *PostgresDB) UpsertVideo(ctx context.Context, video *models.Video) error {
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
			views = EXCLUDED.views,
			rating = EXCLUDED.rating,
			last_updated_at = NOW()
		RETURNING id, added_at
	`

	return db.pool.QueryRow(ctx, query,
		video.ExternalID, video.Title, video.Description, video.Duration, video.DurationStr,
		video.Views, video.Rating, video.Thumbnail, video.ThumbnailLg, video.EmbedURL,
		video.SourceURL, video.Tags, video.Categories, video.Keywords, video.PublishedAt,
	).Scan(&video.ID, &video.AddedAt)
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
		conditions = append(conditions, fmt.Sprintf("$%d = ANY(categories)", argIndex))
		args = append(args, category)
		argIndex++
	}

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("to_tsvector('english', title) @@ plainto_tsquery('english', $%d)", argIndex))
		args = append(args, search)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Determine sort order
	orderClause := "ORDER BY added_at DESC"
	switch sortBy {
	case "views":
		orderClause = "ORDER BY views DESC"
	case "rating":
		orderClause = "ORDER BY rating DESC"
	case "duration":
		orderClause = "ORDER BY duration DESC"
	case "oldest":
		orderClause = "ORDER BY added_at ASC"
	}

	// On the homepage, push generic "bdsm only" matches behind more specifically tagged content.
	if category == "" && search == "" && sortBy == "latest" {
		orderClause = "ORDER BY CASE WHEN cardinality(categories) = 1 AND 'bdsm' = ANY(categories) THEN 1 ELSE 0 END ASC, added_at DESC"
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM videos %s", whereClause)
	var total int64
	err := db.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Fetch videos
	args = append(args, perPage, offset)
	query := fmt.Sprintf(`
		SELECT id, external_id, title, description, duration, duration_str,
			views, rating, thumbnail, thumbnail_lg, embed_url, source_url,
			tags, categories, keywords, added_at, published_at, last_updated_at
		FROM videos %s %s LIMIT $%d OFFSET $%d
	`, whereClause, orderClause, argIndex, argIndex+1)

	rows, err := db.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []models.Video
	for rows.Next() {
		var v models.Video
		err := rows.Scan(
			&v.ID, &v.ExternalID, &v.Title, &v.Description,
			&v.Duration, &v.DurationStr, &v.Views, &v.Rating,
			&v.Thumbnail, &v.ThumbnailLg, &v.EmbedURL, &v.SourceURL,
			&v.Tags, &v.Categories, &v.Keywords, &v.AddedAt,
			&v.PublishedAt, &v.LastUpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
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
func (db *PostgresDB) GetRelatedVideos(ctx context.Context, videoID int64, limit int) ([]models.Video, error) {
	query := `
		WITH target AS (
			SELECT categories, tags FROM videos WHERE id = $1
		)
		SELECT v.id, v.external_id, v.title, v.description, v.duration, v.duration_str,
			v.views, v.rating, v.thumbnail, v.thumbnail_lg, v.embed_url, v.source_url,
			v.tags, v.categories, v.keywords, v.added_at, v.published_at, v.last_updated_at
		FROM videos v, target t
		WHERE v.id != $1
		AND (v.categories && t.categories OR v.tags && t.tags)
		ORDER BY
			(SELECT COUNT(*) FROM unnest(v.categories) c WHERE c = ANY(t.categories)) +
			(SELECT COUNT(*) FROM unnest(v.tags) tag WHERE tag = ANY(t.tags)) DESC,
			v.views DESC
		LIMIT $2
	`

	rows, err := db.pool.Query(ctx, query, videoID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []models.Video
	for rows.Next() {
		var v models.Video
		err := rows.Scan(
			&v.ID, &v.ExternalID, &v.Title, &v.Description,
			&v.Duration, &v.DurationStr, &v.Views, &v.Rating,
			&v.Thumbnail, &v.ThumbnailLg, &v.EmbedURL, &v.SourceURL,
			&v.Tags, &v.Categories, &v.Keywords, &v.AddedAt,
			&v.PublishedAt, &v.LastUpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}

	return videos, nil
}
