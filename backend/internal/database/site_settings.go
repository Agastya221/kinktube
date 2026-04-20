package database

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"

	"kinktube/internal/models"
)

func (db *PostgresDB) GetSiteSettings(ctx context.Context, defaults *models.SiteSettings) (*models.SiteSettings, error) {
	settings := defaults
	if settings == nil {
		settings = &models.SiteSettings{}
	}

	var raw []byte
	err := db.pool.QueryRow(ctx, `
		SELECT data
		FROM site_settings
		WHERE id = 1
	`).Scan(&raw)
	if err == pgx.ErrNoRows {
		models.NormalizeSiteSettings(settings)
		return settings, nil
	}
	if err != nil {
		return nil, err
	}

	if len(raw) > 0 {
		if err := json.Unmarshal(raw, settings); err != nil {
			return nil, err
		}
	}

	models.NormalizeSiteSettings(settings)
	return settings, nil
}

func (db *PostgresDB) SaveSiteSettings(ctx context.Context, settings *models.SiteSettings) error {
	models.NormalizeSiteSettings(settings)

	data, err := json.Marshal(settings)
	if err != nil {
		return err
	}

	_, err = db.pool.Exec(ctx, `
		INSERT INTO site_settings (id, data, updated_at)
		VALUES (1, $1, NOW())
		ON CONFLICT (id) DO UPDATE SET
			data = EXCLUDED.data,
			updated_at = NOW()
	`, data)

	return err
}
