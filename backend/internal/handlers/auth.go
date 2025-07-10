package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/axywe/distributed-benchmarks/internal/db"
	"github.com/axywe/distributed-benchmarks/internal/helpers"
	"github.com/axywe/distributed-benchmarks/sessions"
	"github.com/google/uuid"
)

type loginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
}

type RegisterRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
	Group    string `json:"group"`
}

func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// POST /api/v1/login
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	user, err := db.FindUserByLogin(req.Login)
	if err == sql.ErrNoRows || user.Password != req.Password {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	token, err := generateToken()
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	if err := sessions.SaveSession(token, user.ID, 24*time.Hour); err != nil {
		http.Error(w, "Redis error", http.StatusInternalServerError)
		return
	}

	resp := loginResponse{Token: token}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		helpers.WriteErrorResponse(w, "Некорректный JSON", http.StatusBadRequest)
		return
	}

	req.Login = strings.TrimSpace(req.Login)
	req.Password = strings.TrimSpace(req.Password)
	if r.Header.Get("Authorization") != "" {
		userId, err := sessions.GetUserIDByToken(r.Header.Get("Authorization"))
		if err != nil {
			helpers.WriteErrorResponse(w, "Ошибка авторизации", http.StatusUnauthorized)
			return
		}
		user, err := db.FindUserById(userId)
		if err == sql.ErrNoRows {
			helpers.WriteErrorResponse(w, "Ошибка авторизации", http.StatusUnauthorized)
			return
		}
		if user.Group == "admin" {
			req.Group = strings.TrimSpace(req.Group)
		} else {
			helpers.WriteErrorResponse(w, "Недостаточно прав для создания пользователя", http.StatusForbidden)
			return
		}
	} else {
		req.Group = ""
	}

	if req.Login == "" || req.Password == "" {
		helpers.WriteErrorResponse(w, "Все поля обязательны", http.StatusBadRequest)
		return
	}

	if existing, _ := db.FindUserByLogin(req.Login); existing != nil {
		helpers.WriteErrorResponse(w, "Пользователь с таким логином уже существует", http.StatusConflict)
		return
	}

	id, err := db.CreateUser(req.Login, req.Password, req.Group)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка создания пользователя: "+err.Error(), http.StatusInternalServerError)
		return
	}

	sessionToken := uuid.New().String()
	err = sessions.SaveSession(sessionToken, id, 24*time.Hour)
	if err != nil {
		helpers.WriteErrorResponse(w, "Не удалось создать сессию: "+err.Error(), http.StatusInternalServerError)
		return
	}

	helpers.WriteJSONResponse(w, map[string]interface{}{
		"message": "Регистрация и авторизация успешны",
		"token":   sessionToken,
	}, http.StatusCreated)
}

// GET /api/v1/user
func UserHandler(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	if token == "" {
		helpers.WriteErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := sessions.GetUserIDByToken(token)
	if err != nil {
		helpers.WriteErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := db.FindUserById(userID)
	if err != nil {
		helpers.WriteErrorResponse(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	helpers.WriteJSONResponse(w, user, http.StatusOK)
}
