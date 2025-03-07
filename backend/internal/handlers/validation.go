package handlers

import (
	"net/http"

	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
)

// ValidateOptimizationRequest проверяет корректность входных данных для оптимизации.
func ValidateOptimizationRequest(req OptimizationRequest, w http.ResponseWriter) bool {
	if req.Dimension <= 0 {
		helpers.WriteErrorResponse(w, "Некорректное значение dimension, должно быть > 0", http.StatusBadRequest)
		return false
	}
	if req.InstanceID < 0 {
		helpers.WriteErrorResponse(w, "Некорректное значение instance_id, должно быть >= 0", http.StatusBadRequest)
		return false
	}
	if req.NIter <= 0 {
		helpers.WriteErrorResponse(w, "Некорректное значение n_iter, должно быть > 0", http.StatusBadRequest)
		return false
	}
	if req.Algorithm != 1 && req.Algorithm != 2 {
		helpers.WriteErrorResponse(w, "Некорректное значение algorithm, поддерживаются 1 (PSO) и 2 (Байесовская оптимизация)", http.StatusBadRequest)
		return false
	}
	if req.Seed < 0 {
		helpers.WriteErrorResponse(w, "Некорректное значение seed, должно быть >= 0", http.StatusBadRequest)
		return false
	}
	if req.NParticles <= 0 {
		helpers.WriteErrorResponse(w, "Некорректное значение n_particles, должно быть > 0", http.StatusBadRequest)
		return false
	}
	if req.InertiaStart < 0.0 || req.InertiaStart > 1.0 {
		helpers.WriteErrorResponse(w, "Некорректное значение inertia_start, должно быть в диапазоне [0.0, 1.0]", http.StatusBadRequest)
		return false
	}
	if req.InertiaEnd < 0.0 || req.InertiaEnd > 1.0 {
		helpers.WriteErrorResponse(w, "Некорректное значение inertia_end, должно быть в диапазоне [0.0, 1.0]", http.StatusBadRequest)
		return false
	}
	if req.Nostalgia < 0.0 {
		helpers.WriteErrorResponse(w, "Некорректное значение nostalgia, должно быть >= 0", http.StatusBadRequest)
		return false
	}
	if req.Societal < 0.0 {
		helpers.WriteErrorResponse(w, "Некорректное значение societal, должно быть >= 0", http.StatusBadRequest)
		return false
	}
	if req.Topology != "gbest" && req.Topology != "lbest" && req.Topology != "ring" {
		helpers.WriteErrorResponse(w, "Некорректное значение topology, поддерживаются gbest, lbest, ring", http.StatusBadRequest)
		return false
	}
	if req.TolWin <= 0 {
		helpers.WriteErrorResponse(w, "Некорректное значение tol_win, должно быть > 0", http.StatusBadRequest)
		return false
	}
	if req.TolThres != nil && *req.TolThres < 0.0 {
		helpers.WriteErrorResponse(w, "Некорректное значение tol_thres, если задано, оно должно быть >= 0", http.StatusBadRequest)
		return false
	}
	return true
}
