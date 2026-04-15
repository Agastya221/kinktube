package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache wraps the Redis client for caching
type RedisCache struct {
	client *redis.Client
	ttl    time.Duration
}

// NewRedisCache creates a new Redis cache client
func NewRedisCache(ctx context.Context, redisURL string, ttlSeconds int) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Connection pool settings
	opts.PoolSize = 100
	opts.MinIdleConns = 10

	client := redis.NewClient(opts)

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisCache{
		client: client,
		ttl:    time.Duration(ttlSeconds) * time.Second,
	}, nil
}

// Close closes the Redis connection
func (r *RedisCache) Close() error {
	return r.client.Close()
}

// Set stores a value in cache with JSON serialization
func (r *RedisCache) Set(ctx context.Context, key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, data, r.ttl).Err()
}

// SetWithTTL stores a value with a custom TTL
func (r *RedisCache) SetWithTTL(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, data, ttl).Err()
}

// Get retrieves a value from cache and deserializes it
func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Bytes()
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// Delete removes a key from cache
func (r *RedisCache) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

// DeletePattern removes all keys matching a pattern
func (r *RedisCache) DeletePattern(ctx context.Context, pattern string) error {
	iter := r.client.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		if err := r.client.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}

// Exists checks if a key exists
func (r *RedisCache) Exists(ctx context.Context, key string) bool {
	result, _ := r.client.Exists(ctx, key).Result()
	return result > 0
}

// Cache key generators for consistent naming
const (
	CacheKeyVideoList    = "videos:list:%s:%d:%d:%s:%s" // sort:page:perPage:category:search
	CacheKeyVideo        = "video:%d"                    // id
	CacheKeyVideoExt     = "video:ext:%s"                // external_id
	CacheKeyCategories   = "categories:stats:v2"
	CacheKeyMenuCategories = "menu-categories:v2"
	CacheKeyTotalCount   = "videos:total"
	CacheKeyRelated      = "video:%d:related"
)

// VideoListCacheKey generates a cache key for video listings
func VideoListCacheKey(sort string, page, perPage int, category, search string) string {
	return fmt.Sprintf(CacheKeyVideoList, sort, page, perPage, category, search)
}

// VideoCacheKey generates a cache key for a single video
func VideoCacheKey(id int64) string {
	return fmt.Sprintf(CacheKeyVideo, id)
}

// VideoExternalCacheKey generates a cache key for video by external ID
func VideoExternalCacheKey(externalID string) string {
	return fmt.Sprintf(CacheKeyVideoExt, externalID)
}

// RelatedVideosCacheKey generates a cache key for related videos
func RelatedVideosCacheKey(id int64) string {
	return fmt.Sprintf(CacheKeyRelated, id)
}
