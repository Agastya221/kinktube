package database

import (
	"context"
	"strings"

	"kinktube/internal/models"
)

func (db *PostgresDB) CreateContactSubmission(ctx context.Context, submission *models.ContactSubmission) error {
	return db.pool.QueryRow(ctx, `
		INSERT INTO contact_submissions (
			type, name, reply_to, page_url, source_url, subject, message, ip_address, user_agent
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, status, created_at, updated_at
	`,
		submission.Type,
		submission.Name,
		submission.ReplyTo,
		submission.PageURL,
		submission.SourceURL,
		submission.Subject,
		submission.Message,
		submission.IPAddress,
		submission.UserAgent,
	).Scan(&submission.ID, &submission.Status, &submission.CreatedAt, &submission.UpdatedAt)
}

func (db *PostgresDB) ListContactSubmissions(ctx context.Context, limit int) ([]models.ContactSubmission, error) {
	if limit < 1 || limit > 200 {
		limit = 100
	}

	rows, err := db.pool.Query(ctx, `
		SELECT id, type, name, reply_to, page_url, source_url, subject, message, status, ip_address, user_agent, created_at, updated_at
		FROM contact_submissions
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []models.ContactSubmission{}
	for rows.Next() {
		var message models.ContactSubmission
		if err := rows.Scan(
			&message.ID,
			&message.Type,
			&message.Name,
			&message.ReplyTo,
			&message.PageURL,
			&message.SourceURL,
			&message.Subject,
			&message.Message,
			&message.Status,
			&message.IPAddress,
			&message.UserAgent,
			&message.CreatedAt,
			&message.UpdatedAt,
		); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}

	return messages, rows.Err()
}

func (db *PostgresDB) UpdateContactSubmissionStatus(ctx context.Context, id int64, status string) (*models.ContactSubmission, error) {
	status = normalizeSubmissionStatus(status)

	var message models.ContactSubmission
	err := db.pool.QueryRow(ctx, `
		UPDATE contact_submissions
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING id, type, name, reply_to, page_url, source_url, subject, message, status, ip_address, user_agent, created_at, updated_at
	`, id, status).Scan(
		&message.ID,
		&message.Type,
		&message.Name,
		&message.ReplyTo,
		&message.PageURL,
		&message.SourceURL,
		&message.Subject,
		&message.Message,
		&message.Status,
		&message.IPAddress,
		&message.UserAgent,
		&message.CreatedAt,
		&message.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &message, nil
}

func normalizeSubmissionStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "new", "reviewing", "closed":
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return "reviewing"
	}
}
