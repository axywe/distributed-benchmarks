package handlers

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
)

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
