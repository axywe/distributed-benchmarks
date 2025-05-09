package middleware

import (
	"net/http"
	"strings"
	"time"

	"gitlab.com/Taleh/distributed-benchmarks/internal/db"
	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
	"gitlab.com/Taleh/distributed-benchmarks/sessions"
)

func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(authHeader, "Bearer ") {
			helpers.WriteErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		token = strings.TrimSpace(token)

		userID, err := sessions.GetUserIDByToken(token)
		if err != nil {
			helpers.WriteErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		user, err := db.FindUserById(userID)
		if err != nil || user.Group != "admin" {
			helpers.WriteErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		_ = sessions.SaveSession(token, userID, 30*time.Minute)

		next.ServeHTTP(w, r)
	})
}
