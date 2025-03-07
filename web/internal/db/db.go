package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/fs"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
)

// OptimizationResult описывает структуру JSON-файла с результатами.
type OptimizationResult struct {
	AlgorithmName    string             `json:"algorithm_name"`
	AlgorithmVersion string             `json:"algorithm_version"`
	Parameters       Parameters         `json:"parameters"`
	ExpectedBudget   int                `json:"expected_budget"`
	ActualBudget     int                `json:"actual_budget"`
	BestResult       map[string]float64 `json:"best_result"`
}

// Parameters описывает параметры оптимизации.
type Parameters struct {
	Dimension    int      `json:"dimension"`
	InstanceID   int      `json:"instance_id"`
	NIter        int      `json:"n_iter"`
	Algorithm    int      `json:"algorithm"`
	Seed         int      `json:"seed"`
	NParticles   int      `json:"n_particles"`
	InertiaStart float64  `json:"inertia_start"`
	InertiaEnd   float64  `json:"inertia_end"`
	Nostalgia    float64  `json:"nostalgia"`
	Societal     float64  `json:"societal"`
	Topology     string   `json:"topology"`
	TolThres     *float64 `json:"tol_thres"`
	TolWin       int      `json:"tol_win"`
}

var db *sql.DB

// InitDB устанавливает соединение с базой данных Postgres.
func InitDB(connStr string) error {
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("ошибка открытия БД: %v", err)
	}
	return db.Ping()
}

// parseBestResult извлекает массив значений x из best_result и значение f[1].
func parseBestResult(br map[string]float64) ([]float64, float64, error) {
	var xs []struct {
		Index int
		Value float64
	}
	var bestF float64
	foundF := false

	for key, value := range br {
		if strings.HasPrefix(key, "x[") && strings.HasSuffix(key, "]") {
			numStr := key[2 : len(key)-1]
			idx, err := strconv.Atoi(numStr)
			if err != nil {
				return nil, 0, fmt.Errorf("не удалось преобразовать %s в число: %v", numStr, err)
			}
			xs = append(xs, struct {
				Index int
				Value float64
			}{Index: idx, Value: value})
		} else if key == "f[1]" {
			bestF = value
			foundF = true
		}
	}
	if !foundF {
		return nil, 0, fmt.Errorf("значение f[1] не найдено в best_result")
	}
	// Сортируем по индексу
	sort.Slice(xs, func(i, j int) bool {
		return xs[i].Index < xs[j].Index
	})
	var result []float64
	for _, item := range xs {
		result = append(result, item.Value)
	}
	return result, bestF, nil
}

// InsertOptimizationResult вставляет результат оптимизации в таблицу optimization_results.
func InsertOptimizationResult(or OptimizationResult) error {
	bestX, bestF, err := parseBestResult(or.BestResult)
	if err != nil {
		return fmt.Errorf("ошибка разбора best_result: %v", err)
	}

	query := `
INSERT INTO optimization_results
(algorithm_name, algorithm_version, dimension, instance_id, n_iter, algorithm, seed, n_particles, inertia_start, inertia_end, nostalgia, societal, topology, tol_thres, tol_win, expected_budget, actual_budget, best_result_x, best_result_f)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
`
	_, err = db.Exec(query,
		or.AlgorithmName,
		or.AlgorithmVersion,
		or.Parameters.Dimension,
		or.Parameters.InstanceID,
		or.Parameters.NIter,
		or.Parameters.Algorithm,
		or.Parameters.Seed,
		or.Parameters.NParticles,
		or.Parameters.InertiaStart,
		or.Parameters.InertiaEnd,
		or.Parameters.Nostalgia,
		or.Parameters.Societal,
		or.Parameters.Topology,
		or.Parameters.TolThres,
		or.Parameters.TolWin,
		or.ExpectedBudget,
		or.ActualBudget,
		pq.Array(bestX),
		bestF,
	)
	if err != nil {
		return fmt.Errorf("ошибка вставки записи: %v", err)
	}
	return nil
}

// ScanResultsFolder обходит все поддиректории в resultsDir, ищет файлы results.json и вставляет записи в БД.
func ScanResultsFolder(resultsDir string) error {
	return filepath.WalkDir(resultsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		// Если это директория, которая уже обработана, пропускаем её
		if d.IsDir() && strings.HasSuffix(d.Name(), ".processed") {
			return filepath.SkipDir
		}
		// Если это файл results.json
		if !d.IsDir() && d.Name() == "results.json" {
			// Чтение файла results.json
			data, err := ioutil.ReadFile(path)
			if err != nil {
				log.Printf("Ошибка чтения файла %s: %v", path, err)
				return nil
			}
			var res OptimizationResult
			if err := json.Unmarshal(data, &res); err != nil {
				log.Printf("Ошибка разбора JSON в файле %s: %v", path, err)
				return nil
			}
			// Вставка в таблицу
			if err := InsertOptimizationResult(res); err != nil {
				log.Printf("Ошибка вставки результата из файла %s: %v", path, err)
				return nil
			}
			log.Printf("Успешно добавлен результат из %s", path)
			// Переименовываем родительскую папку
			parentDir := filepath.Dir(path)
			newDir := parentDir + ".processed"
			if err := os.Rename(parentDir, newDir); err != nil {
				log.Printf("Ошибка переименования папки %s: %v", parentDir, err)
			} else {
				log.Printf("Папка %s переименована в %s", parentDir, newDir)
			}
		}
		return nil
	})
}

// StartCronTask запускает периодическое сканирование каталога results.
// interval - интервал между запусками (например, time.Hour)
func StartCronTask(resultsDir string, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for {
			<-ticker.C
			log.Printf("Запуск сканирования каталога: %s", resultsDir)
			if err := ScanResultsFolder(resultsDir); err != nil {
				log.Printf("Ошибка сканирования каталога: %v", err)
			}
		}
	}()
}
