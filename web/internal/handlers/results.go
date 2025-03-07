// internal/handlers/results.go
package handlers

import (
	"encoding/json"
	"html/template"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type OptimizationResultSummary struct {
	ResultID      string
	AlgorithmName string
	DownloadLink  string
}

func ResultPageHandler(w http.ResponseWriter, r *http.Request) {
	resultID := strings.TrimPrefix(r.URL.Path, "/results/")
	if resultID == "" || strings.Contains(resultID, "/") {
		http.Error(w, "Неверный идентификатор результата", http.StatusBadRequest)
		return
	}
	resultDir := filepath.Join("results", resultID+".processed")
	info, err := os.Stat(resultDir)
	if err != nil || !info.IsDir() {
		http.Error(w, "Папка с результатом не найдена", http.StatusNotFound)
		return
	}
	jsonPath := filepath.Join(resultDir, "results.json")
	data, err := ioutil.ReadFile(jsonPath)
	if err != nil {
		http.Error(w, "Файл results.json не найден", http.StatusNotFound)
		return
	}
	var res map[string]interface{}
	if err := json.Unmarshal(data, &res); err != nil {
		http.Error(w, "Ошибка парсинга results.json", http.StatusInternalServerError)
		return
	}
	algoName, ok := res["algorithm_name"].(string)
	if !ok {
		algoName = "Неизвестный алгоритм"
	}
	summary := OptimizationResultSummary{
		ResultID:      resultID,
		AlgorithmName: algoName,
		DownloadLink:  "/results/" + resultID + "/download",
	}
	tmpl, err := template.ParseFiles("web/templates/result_details.html")
	if err != nil {
		http.Error(w, "Ошибка загрузки шаблона", http.StatusInternalServerError)
		return
	}
	if err := tmpl.Execute(w, summary); err != nil {
		http.Error(w, "Ошибка отображения страницы", http.StatusInternalServerError)
		return
	}
}

func ResultDownloadHandler(w http.ResponseWriter, r *http.Request) {
	// Ожидается путь: /results/{resultID}/download
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Неверный путь", http.StatusBadRequest)
		return
	}
	resultID := parts[2] + ".processed"
	resultDir := filepath.Join("results", resultID)
	csvPath := filepath.Join(resultDir, "results.csv")
	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		http.Error(w, "Файл results.csv не найден", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Disposition", "attachment; filename=results.csv")
	w.Header().Set("Content-Type", "text/csv")
	http.ServeFile(w, r, csvPath)
}
