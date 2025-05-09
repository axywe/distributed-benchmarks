package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
)

const basePath = "bench/custom"
const trashBase = "trash"

// FileInfo — ответ для списка
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
// multipart/form-data: поле "file", поле "path"
func UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	// max upload размер, если надо:
	// r.ParseMultipartForm(10 << 20)
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
	// 1) Берём путь из URL
	pathParam := mux.Vars(r)["path"]
	cleanPath := filepath.Clean(pathParam)
	if cleanPath == "" || cleanPath == "." || cleanPath == "/" {
		helpers.WriteErrorResponse(w, "Неверный путь для удаления", http.StatusBadRequest)
		return
	}

	// 2) Формируем источник и проверяем безопасность
	src := filepath.Join(basePath, cleanPath)
	if !strings.HasPrefix(src, filepath.Clean(basePath)) {
		helpers.WriteErrorResponse(w, "Запрещён доступ вне директории", http.StatusForbidden)
		return
	}

	// 3) Перемещаем в корзину с таймстемпом
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
// JSON { "path":"sub/dir", "name":"newFolder" }
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
	// читаем параметры
	relPath := r.URL.Query().Get("path")
	name := r.URL.Query().Get("name")
	if name == "" {
		helpers.WriteErrorResponse(w, "Не указан параметр name", http.StatusBadRequest)
		return
	}

	// чистим и собираем полный путь
	cleanPath := filepath.Clean(relPath)
	filePath := filepath.Join(basePath, cleanPath, name)

	// защита от выхода за корень
	if !strings.HasPrefix(filepath.Clean(filePath), filepath.Clean(basePath)) {
		helpers.WriteErrorResponse(w, "Запрещён доступ вне директории", http.StatusForbidden)
		return
	}

	// проверяем, что это файл
	info, err := os.Stat(filePath)
	if err != nil || info.IsDir() {
		helpers.WriteErrorResponse(w, "Файл не найден", http.StatusNotFound)
		return
	}

	// отдать файл
	http.ServeFile(w, r, filePath)
}
