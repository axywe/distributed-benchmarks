package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/axywe/distributed-benchmarks/internal/db"
	"github.com/axywe/distributed-benchmarks/internal/helpers"
	"github.com/gorilla/mux"
)

const insertPrefix = "custom."

// GET /api/v1/methods
func GetAllOptimizationMethodsHandler(w http.ResponseWriter, r *http.Request) {
	methods, err := db.GetAllOptimizationMethods()
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка получения методов: "+err.Error(), http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, methods, http.StatusOK)
}

// POST /api/v1/methods
func CreateOptimizationMethodHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name       string                                `json:"name"`
		Parameters map[string]db.OptimizationMethodParam `json:"parameters"`
		FilePath   string                                `json:"file_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		helpers.WriteErrorResponse(w, "Некорректный JSON", http.StatusBadRequest)
		return
	}
	id, err := db.InsertOptimizationMethod(insertPrefix+req.Name, req.Parameters, req.FilePath)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка создания метода: "+err.Error(), http.StatusInternalServerError)
		return
	}
	method, err := db.GetOptimizationMethodByID(id)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка получения созданного метода: "+err.Error(), http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, method, http.StatusCreated)
}

// DELETE /api/v1/methods/{id}
func DeleteOptimizationMethodHandler(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		helpers.WriteErrorResponse(w, "Неверный ID метода", http.StatusBadRequest)
		return
	}
	if err := db.DeleteOptimizationMethodByID(id); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка удаления метода: "+err.Error(), http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, map[string]string{"message": "Метод удалён"}, http.StatusOK)
}
