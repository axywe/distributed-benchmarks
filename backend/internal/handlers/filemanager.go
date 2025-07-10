package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/axywe/distributed-benchmarks/internal/helpers"
	"github.com/gorilla/mux"
)

const basePath = "bench/custom"
const trashBase = "trash"

type FileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"is_dir"`
}

// GET /api/v1/files?path=subdir
func ListFilesHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	fullPath := filepath.Join(basePath, filepath.Clean(path))

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка чтения директории", http.StatusBadRequest)
		return
	}

	var out []FileInfo
	for _, e := range entries {
		out = append(out, FileInfo{
			Name:  e.Name(),
			Path:  filepath.Join(path, e.Name()),
			IsDir: e.IsDir(),
		})
	}
	helpers.WriteJSONResponse(w, out, http.StatusOK)
}

// POST /api/v1/files/upload
func UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	path := r.FormValue("path")
	fullPath := filepath.Join(basePath, filepath.Clean(path))
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		helpers.WriteErrorResponse(w, "Не удалось создать директорию", http.StatusInternalServerError)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка загрузки файла", http.StatusBadRequest)
		return
	}
	defer file.Close()

	dst, err := os.Create(filepath.Join(fullPath, header.Filename))
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка создания файла", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка сохранения файла", http.StatusInternalServerError)
		return
	}

	helpers.WriteJSONResponse(w, map[string]string{"status": "ok"}, http.StatusOK)
}

// DELETE /api/v1/files/{path:.*}
func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	pathParam := mux.Vars(r)["path"]
	cleanPath := filepath.Clean(pathParam)
	if cleanPath == "" || cleanPath == "." || cleanPath == "/" {
		helpers.WriteErrorResponse(w, "Неверный путь для удаления", http.StatusBadRequest)
		return
	}

	src := filepath.Join(basePath, cleanPath)
	if !strings.HasPrefix(src, filepath.Clean(basePath)) {
		helpers.WriteErrorResponse(w, "Запрещён доступ вне директории", http.StatusForbidden)
		return
	}

	ts := time.Now().Format("20060102_150405")
	dst := filepath.Join(trashBase, ts, cleanPath)
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		helpers.WriteErrorResponse(w, "Не удалось создать корзину: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := os.Rename(src, dst); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка перемещения в корзину: "+err.Error(), http.StatusInternalServerError)
		return
	}

	helpers.WriteJSONResponse(w, map[string]string{"message": "Перемещено в корзину"}, http.StatusOK)
}

// POST /api/v1/folders
func CreateFolderHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		helpers.WriteErrorResponse(w, "Некорректный JSON", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		helpers.WriteErrorResponse(w, "Не указано имя папки", http.StatusBadRequest)
		return
	}

	combined := filepath.Join(req.Path, req.Name)
	cleanPath := filepath.Clean(combined)
	if cleanPath == "" || cleanPath == "." || cleanPath == "/" {
		helpers.WriteErrorResponse(w, "Неверный путь для создания", http.StatusBadRequest)
		return
	}

	full := filepath.Join(basePath, cleanPath)
	if !strings.HasPrefix(full, filepath.Clean(basePath)) {
		helpers.WriteErrorResponse(w, "Запрещён доступ вне папки", http.StatusForbidden)
		return
	}

	if err := os.MkdirAll(full, 0755); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка создания папки", http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, map[string]string{"status": "created"}, http.StatusOK)
}

func RawFileHandler(w http.ResponseWriter, r *http.Request) {
	relPath := r.URL.Query().Get("path")
	name := r.URL.Query().Get("name")
	if name == "" {
		helpers.WriteErrorResponse(w, "Не указан параметр name", http.StatusBadRequest)
		return
	}

	cleanPath := filepath.Clean(relPath)
	filePath := filepath.Join(basePath, cleanPath, name)

	if !strings.HasPrefix(filepath.Clean(filePath), filepath.Clean(basePath)) {
		helpers.WriteErrorResponse(w, "Запрещён доступ вне директории", http.StatusForbidden)
		return
	}

	info, err := os.Stat(filePath)
	if err != nil || info.IsDir() {
		helpers.WriteErrorResponse(w, "Файл не найден", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, filePath)
}
