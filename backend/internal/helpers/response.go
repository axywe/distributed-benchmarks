package helpers

import (
	"encoding/json"
	"net/http"
	"time"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    interface{} `json:"meta"`
}

func WriteJSONResponse(w http.ResponseWriter, data interface{}, statusCode int, meta ...map[string]interface{}) {
	finalMeta := map[string]interface{}{
		"timestamp": time.Now().UTC(),
	}
	if len(meta) > 0 {
		for key, value := range meta[0] {
			finalMeta[key] = value
		}
	}
	resp := APIResponse{
		Success: true,
		Data:    data,
		Meta:    finalMeta,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(resp)
}

func WriteErrorResponse(w http.ResponseWriter, errMsg string, statusCode int) {
	resp := APIResponse{
		Success: false,
		Data:    nil,
		Meta: map[string]interface{}{
			"message":   errMsg,
			"timestamp": time.Now().UTC(),
		},
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(resp)
}
