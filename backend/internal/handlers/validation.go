package handlers

import (
	"net/http"

	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
)

// ValidateOptimizationRequest проверяет общие поля.
func ValidateOptimizationRequest(w http.ResponseWriter, req OptimizationRequest) bool {
	if req.Dimension <= 0 {
		helpers.WriteErrorResponse(w, "dimension должно быть > 0", http.StatusBadRequest)
		return false
	}
	if req.InstanceID < 0 {
		helpers.WriteErrorResponse(w, "instance_id >= 0", http.StatusBadRequest)
		return false
	}
	if req.NIter <= 0 {
		helpers.WriteErrorResponse(w, "n_iter > 0", http.StatusBadRequest)
		return false
	}
	if req.Seed < 0 {
		helpers.WriteErrorResponse(w, "seed >= 0", http.StatusBadRequest)
		return false
	}
	return true
}
