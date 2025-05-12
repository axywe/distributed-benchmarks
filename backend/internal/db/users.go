package db

import (
	"database/sql"
	"fmt"
)

type User struct {
	ID       int    `json:"id"`
	Login    string `json:"login"`
	Password string `json:"password"`
	Group    string `json:"group"`
}

func FindUserByLogin(login string) (*User, error) {
	row := DB.QueryRow(`SELECT id, login, password, "group" FROM users WHERE login = $1`, login)

	var u User
	if err := row.Scan(&u.ID, &u.Login, &u.Password, &u.Group); err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("ошибка при получении пользователя: %v", err)
	}
	return &u, nil
}

func FindUserById(id int) (*User, error) {
	row := DB.QueryRow(`SELECT id, login, password, "group" FROM users WHERE id = $1`, id)

	var u User
	if err := row.Scan(&u.ID, &u.Login, &u.Password, &u.Group); err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("ошибка при получении пользователя: %v", err)
	}
	return &u, nil
}

func CreateUser(login, password, group string) (int, error) {
	var id int
	err := DB.QueryRow(`
		INSERT INTO users (login, password, "group")
		VALUES ($1, $2, $3)
		RETURNING id
	`, login, password, group).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("ошибка при создании пользователя: %v", err)
	}
	return id, nil
}
