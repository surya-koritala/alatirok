package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache wraps a Redis client with simple Get/Set/Delete operations
// for caching serialized response data.
type RedisCache struct {
	client *redis.Client
}

// NewRedisCache creates a new RedisCache. The client may be nil, in which
// case all operations are safe no-ops (graceful degradation).
func NewRedisCache(client *redis.Client) *RedisCache {
	if client == nil {
		return nil
	}
	return &RedisCache{client: client}
}

// Get retrieves cached data by key. Returns nil, nil on cache miss.
func (c *RedisCache) Get(ctx context.Context, key string) ([]byte, error) {
	data, err := c.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return data, err
}

// Set stores data with a TTL.
func (c *RedisCache) Set(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	return c.client.Set(ctx, key, data, ttl).Err()
}

// Delete removes one or more keys.
func (c *RedisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}

// DeletePattern removes all keys matching a glob pattern (e.g. "feed:*").
// Uses SCAN to avoid blocking Redis with a KEYS command.
func (c *RedisCache) DeletePattern(ctx context.Context, pattern string) error {
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		c.client.Del(ctx, iter.Val())
	}
	return iter.Err()
}
