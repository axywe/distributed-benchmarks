package db

import (
	"encoding/json"
	"fmt"
)

// OptimizationMethodParam описывает один параметр метода.
type OptimizationMethodParam struct {
	Type     string      `json:"type"`               // "int", "float", "string"
	Default  interface{} `json:"default"`            // значение по умолчанию
	Nullable bool        `json:"nullable,omitempty"` // допускается null
}

// OptimizationMethod описывает метод оптимизации.
type OptimizationMethod struct {
	ID         int                                `json:"id"`
	Name       string                             `json:"name"`
	Parameters map[string]OptimizationMethodParam `json:"parameters"`
	FilePath   string                             `json:"file_path"`
}

// GetAllOptimizationMethods возвращает все методы из БД.
func GetAllOptimizationMethods() ([]OptimizationMethod, error) {
	rows, err := DB.Query(`SELECT id, name, parameters, file_path FROM optimization_methods`)
	if err != nil {
		return nil, fmt.Errorf("ошибка запроса методов: %v", err)
	}
	defer rows.Close()

	var methods []OptimizationMethod
	for rows.Next() {
		var m OptimizationMethod
		var raw []byte
		if err := rows.Scan(&m.ID, &m.Name, &raw, &m.FilePath); err != nil {
			return nil, fmt.Errorf("ошибка сканирования метода: %v", err)
		}
		if err := json.Unmarshal(raw, &m.Parameters); err != nil {
			return nil, fmt.Errorf("ошибка разбора JSON параметров: %v", err)
		}
		methods = append(methods, m)
	}
	return methods, nil
}

// GetOptimizationMethodByID получает один метод по его ID.
func GetOptimizationMethodByID(id int) (*OptimizationMethod, error) {
	row := DB.QueryRow(`SELECT id, name, parameters, file_path FROM optimization_methods WHERE id=$1`, id)
	var m OptimizationMethod
	var raw []byte
	if err := row.Scan(&m.ID, &m.Name, &raw, &m.FilePath); err != nil {
		return nil, fmt.Errorf("ошибка получения метода: %v", err)
	}
	if err := json.Unmarshal(raw, &m.Parameters); err != nil {
		return nil, fmt.Errorf("ошибка разбора JSON параметров: %v", err)
	}
	return &m, nil
}
