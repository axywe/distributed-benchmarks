package db

import (
	"encoding/json"
	"fmt"
)

type OptimizationMethodParam struct {
	Type     string      `json:"type"`
	Default  interface{} `json:"default"`
	Nullable bool        `json:"nullable,omitempty"`
}

type OptimizationMethod struct {
	ID         int                                `json:"id"`
	Name       string                             `json:"name"`
	Parameters map[string]OptimizationMethodParam `json:"parameters"`
	FilePath   string                             `json:"file_path"`
}

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

func InsertOptimizationMethod(
	name string,
	params map[string]OptimizationMethodParam,
	filePath string,
) (int, error) {
	raw, err := json.Marshal(params)
	if err != nil {
		return 0, fmt.Errorf("ошибка сериализации параметров: %v", err)
	}
	var id int
	err = DB.QueryRow(`
        INSERT INTO optimization_methods (name, parameters, file_path)
        VALUES ($1, $2, $3)
        RETURNING id
    `, name, raw, filePath).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("ошибка вставки метода: %v", err)
	}
	return id, nil
}

func DeleteOptimizationMethodByID(id int) error {
	_, err := DB.Exec(`DELETE FROM optimization_methods WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("ошибка удаления метода: %v", err)
	}
	return nil
}
