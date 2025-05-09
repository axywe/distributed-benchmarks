package db

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB устанавливает соединение с Postgres.
func InitDB(connStr string) error {
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("ошибка открытия БД: %v", err)
	}
	return DB.Ping()
}
