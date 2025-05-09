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
	"sort"
	"strings"

	"github.com/gorilla/mux"
	"gitlab.com/Taleh/distributed-benchmarks/internal/db"
	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
	"gitlab.com/Taleh/distributed-benchmarks/internal/utils"
)

type OptimizationRequest struct {
	Dimension  int `json:"dimension"`
	InstanceID int `json:"instance_id"`
	NIter      int `json:"n_iter"`
	Algorithm  int `json:"algorithm"` // method_id
	Seed       int `json:"seed"`
}

type OptimizationPostResponse struct {
	Cached        bool                    `json:"cached"`
	Matches       []db.OptimizationResult `json:"matches,omitempty"`
	ContainerName string                  `json:"container_name,omitempty"`
}

// POST /api/v1/optimization
func OptimizationPostHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Считаем сырое тело
	body, err := io.ReadAll(r.Body)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка чтения тела запроса", http.StatusBadRequest)
		return
	}

	// 2. Парсим в map для произвольных аргументов
	var inputArgs map[string]interface{}
	if err := json.Unmarshal(body, &inputArgs); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка парсинга JSON", http.StatusBadRequest)
		return
	}

	// 3. Проверяем наличие флага принудительного запуска
	forceRun := false
	if force, ok := inputArgs["force_run"]; ok {
		if b, ok := force.(bool); ok && b {
			forceRun = true
		}
		// Удаляем параметр force_run перед передачей в RunCommand
		delete(inputArgs, "force_run")
	}

	// 4. Извлекаем обязательный метод (algorithm) и проверяем его существование
	rawAlgo, ok := inputArgs["algorithm"]
	if !ok {
		helpers.WriteErrorResponse(w, "Не указан параметр algorithm", http.StatusBadRequest)
		return
	}
	algoFloat, ok := rawAlgo.(float64)
	if !ok {
		helpers.WriteErrorResponse(w, "Некорректный тип для algorithm", http.StatusBadRequest)
		return
	}
	methodID := int(algoFloat)
	method, err := db.GetOptimizationMethodByID(methodID)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка загрузки метода: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if method == nil {
		helpers.WriteErrorResponse(w, "Метод не найден", http.StatusBadRequest)
		return
	}

	// 5. Валидация обязательных полей (если не force_run)
	if !forceRun {
		if err := validateCoreFields(inputArgs); err != nil {
			helpers.WriteErrorResponse(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	// 6. Поиск в кэше (если не force_run)
	if !forceRun {
		matches, err := db.SearchOptimizationResults(inputArgs)
		if err != nil {
			helpers.WriteErrorResponse(w, "Ошибка поиска: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if len(matches) > 0 {
			// Возвращаем весь массив matches
			helpers.WriteJSONResponse(w, OptimizationPostResponse{
				Cached:  true,
				Matches: matches,
			}, http.StatusOK)
			return
		}
	}

	// 7. Подготовка аргументов для RunCommand
	var keys []string
	for k := range inputArgs {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var args []string
	for _, k := range keys {
		val := inputArgs[k]
		if val == nil {
			continue
		}
		args = append(args, "--"+k, fmt.Sprint(val))
	}

	if method.Name != "" {
		args = append(args, "--method", method.Name)
	} else {
		helpers.WriteErrorResponse(w, "Метод не задан", http.StatusBadRequest)
		return
	}

	// 8. Запуск команды
	output, err := utils.RunCommand(args)
	if err != nil {
		log.Printf("Ошибка запуска команды: %v\nВывод: %s\n", err, string(output))
		helpers.WriteErrorResponse(w, "Ошибка выполнения команды оптимизации", http.StatusInternalServerError)
		return
	}

	// 9. Последняя строка вывода — имя контейнера
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	container := lines[len(lines)-1]

	// 10. Ответ клиенту
	helpers.WriteJSONResponse(w, OptimizationPostResponse{
		Cached:        false,
		ContainerName: container,
	}, http.StatusOK)
}

// validateCoreFields проверяет наличие и корректность dimension, instance_id, n_iter, seed
func validateCoreFields(m map[string]interface{}) error {
	required := []string{"dimension", "instance_id", "n_iter", "seed"}
	for _, key := range required {
		val, ok := m[key]
		if !ok {
			return fmt.Errorf("не указан параметр %s", key)
		}
		// JSON числа приходят как float64
		num, ok := val.(float64)
		if !ok {
			return fmt.Errorf("некорректный тип для %s", key)
		}
		if num < 0 {
			return fmt.Errorf("параметр %s должен быть неотрицательным", key)
		}
		// dimension и n_iter > 0
		if (key == "dimension" || key == "n_iter") && num <= 0 {
			return fmt.Errorf("параметр %s должен быть > 0", key)
		}
	}
	return nil
}

// GET /api/v1/optimization/results/{id}
func OptimizationResultHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	resultID, ok := vars["id"]
	if !ok || resultID == "" {
		helpers.WriteErrorResponse(w, "Неверный идентификатор результата", http.StatusBadRequest)
		return
	}

	resultDir := filepath.Join("results", resultID+".processed")
	info, err := os.Stat(resultDir)
	if err != nil || !info.IsDir() {
		helpers.WriteErrorResponse(w, "Папка с результатом не найдена", http.StatusNotFound)
		return
	}

	jsonPath := filepath.Join(resultDir, "results.json")
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		helpers.WriteErrorResponse(w, "Файл results.json не найден", http.StatusNotFound)
		return
	}

	var res db.OptimizationResult
	if err := json.Unmarshal(data, &res); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка парсинга results.json", http.StatusInternalServerError)
		return
	}

	res.ResultID = resultID

	helpers.WriteJSONResponse(w, res, http.StatusOK)
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
