package sessions

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	client *redis.Client
	ctx    = context.Background()
)

func Init() error {
	addr := os.Getenv("REDIS_ADDR")
	pass := os.Getenv("REDIS_PASSWORD")
	db := 0

	client = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: pass,
		DB:       db,
	})

	_, err := client.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("не удалось подключиться к Redis: %w", err)
	}

	return nil
}

func SaveSession(token string, userID int, ttl time.Duration) error {
	key := "session:" + token
	err := client.Set(ctx, key, userID, ttl).Err()
	if err != nil {
		return fmt.Errorf("ошибка сохранения сессии: %w", err)
	}
	return nil
}

func GetUserIDByToken(rawToken string) (int, error) {
	token := strings.TrimPrefix(rawToken, "Bearer ")
	key := "session:" + token
	val, err := client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, fmt.Errorf("токен не найден")
		}
		return 0, err
	}

	var id int
	_, scanErr := fmt.Sscanf(val, "%d", &id)
	if scanErr != nil {
		return 0, fmt.Errorf("не удалось прочитать userID: %w", scanErr)
	}
	return id, nil
}

func DeleteSession(token string) error {
	key := "session:" + token
	return client.Del(ctx, key).Err()
}
