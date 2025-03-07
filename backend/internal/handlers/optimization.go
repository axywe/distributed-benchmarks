package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
	"gitlab.com/Taleh/distributed-benchmarks/internal/utils"
)

// OptimizationRequest represents the request payload for optimization.
type OptimizationRequest struct {
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

// OptimizationResponse represents a standard API response.
type OptimizationResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    interface{} `json:"meta"`
}

// POST /api/v1/optimization
func OptimizationPostHandler(w http.ResponseWriter, r *http.Request) {
	var req OptimizationRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка чтения тела запроса", http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(body, &req); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка парсинга JSON", http.StatusBadRequest)
		return
	}
	if !ValidateOptimizationRequest(req, w) {
		return
	}
	// Build command arguments
	args := []string{
		"--dimension", strconv.Itoa(req.Dimension),
		"--instance_id", strconv.Itoa(req.InstanceID),
		"--n_iter", strconv.Itoa(req.NIter),
		"--algorithm", strconv.Itoa(req.Algorithm),
		"--seed", strconv.Itoa(req.Seed),
		"--n_particles", strconv.Itoa(req.NParticles),
		"--inertia_start", fmt.Sprintf("%f", req.InertiaStart),
		"--inertia_end", fmt.Sprintf("%f", req.InertiaEnd),
		"--nostalgia", fmt.Sprintf("%f", req.Nostalgia),
		"--societal", fmt.Sprintf("%f", req.Societal),
		"--topology", req.Topology,
		"--tol_win", strconv.Itoa(req.TolWin),
	}
	if req.TolThres != nil {
		args = append(args, "--tol_thres", fmt.Sprintf("%f", *req.TolThres))
	}
	output, err := utils.RunCommand(args)
	if err != nil {
		log.Printf("Ошибка выполнения команды: %v\nВывод: %s\n", err, string(output))
		helpers.WriteErrorResponse(w, fmt.Sprintf("Ошибка выполнения команды: %v", err), http.StatusInternalServerError)
		return
	}

	outputStr := string(output)
	lines := strings.Split(strings.TrimSpace(outputStr), "\n")
	var containerName string
	if len(lines) > 0 {
		containerName = lines[len(lines)-1]
	}
	helpers.WriteJSONResponse(w,
		map[string]interface{}{"container_name": containerName},
		http.StatusOK,
	)
}

// GET /api/v1/optimization/results/{id}
func OptimizationResultHandler(w http.ResponseWriter, r *http.Request) {
	// Извлечение идентификатора результата
	vars := mux.Vars(r)
	resultID, ok := vars["id"]
	if !ok || resultID == "" {
		helpers.WriteErrorResponse(w, "Неверный идентификатор результата", http.StatusBadRequest)
		return
	}

	// Формирование пути к папке с результатами
	resultDir := filepath.Join("results", resultID+".processed")
	info, err := os.Stat(resultDir)
	if err != nil || !info.IsDir() {
		helpers.WriteErrorResponse(w, "Папка с результатом не найдена", http.StatusNotFound)
		return
	}

	// Формирование пути к файлу JSON
	jsonPath := filepath.Join(resultDir, "results.json")
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		helpers.WriteErrorResponse(w, "Файл results.json не найден", http.StatusNotFound)
		return
	}

	// Парсинг JSON
	var res interface{}
	if err := json.Unmarshal(data, &res); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка парсинга results.json", http.StatusInternalServerError)
		return
	}

	// Отправка успешного JSON-ответа
	helpers.WriteJSONResponse(w, res, http.StatusOK, map[string]interface{}{"count": 1})
}

// GET /api/v1/optimization/results/{id}/download
func OptimizationDownloadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	resultID, ok := vars["id"]
	if !ok || resultID == "" {
		http.Error(w, "Неверный идентификатор результата", http.StatusBadRequest)
		return
	}
	resultDir := filepath.Join("results", resultID+".processed")
	csvPath := filepath.Join(resultDir, "results.csv")
	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		http.Error(w, "Файл results.csv не найден", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Disposition", "attachment; filename=results.csv")
	w.Header().Set("Content-Type", "text/csv")
	http.ServeFile(w, r, csvPath)
}

// GET /api/v1/optimization/logs?container={container}
func ContainerLogsHandler(w http.ResponseWriter, r *http.Request) {
	containerName := r.URL.Query().Get("container")
	if containerName == "" {
		http.Error(w, "Не указан контейнер для логирования", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	cmd := exec.Command("docker", "logs", "-f", containerName)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, fmt.Sprintf("Не удалось получить логи: %v", err), http.StatusInternalServerError)
		return
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		http.Error(w, fmt.Sprintf("Не удалось получить stderr: %v", err), http.StatusInternalServerError)
		return
	}
	if err := cmd.Start(); err != nil {
		http.Error(w, fmt.Sprintf("Не удалось запустить поток логов: %v", err), http.StatusInternalServerError)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Поток не поддерживает флешинг", http.StatusInternalServerError)
		return
	}
	go func() {
		errOutput, _ := io.ReadAll(stderr)
		if len(errOutput) > 0 {
			log.Printf("stderr: %s", string(errOutput))
		}
	}()
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Fprintf(w, "data: %s\n\n", line)
		flusher.Flush()
	}
	if err := scanner.Err(); err != nil {
		log.Printf("Ошибка чтения логов: %v", err)
	}
	fmt.Fprintf(w, "event: finish\ndata: Контейнер завершил работу\n\n")
	flusher.Flush()
	cmd.Wait()
}
