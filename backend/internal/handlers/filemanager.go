package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"

	"gitlab.com/Taleh/distributed-benchmarks/internal/helpers"
)

const basePath = "bench/custom"

type FileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"is_dir"`
}

// GET /api/v1/files?path=subdir
func ListFilesHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	fullPath := filepath.Join(basePath, filepath.Clean(path))

	files, err := os.ReadDir(fullPath)
	if err != nil {
		helpers.WriteErrorResponse(w, "Ошибка чтения директории", http.StatusBadRequest)
		return
	}

	var result []FileInfo
	for _, f := range files {
		result = append(result, FileInfo{
			Name:  f.Name(),
			Path:  filepath.Join(path, f.Name()),
			IsDir: f.IsDir(),
		})
	}
	helpers.WriteJSONResponse(w, result, http.StatusOK)
}

// POST /api/v1/files/upload?path=subdir
func UploadFileHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	fullPath := filepath.Join(basePath, filepath.Clean(path))

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

// DELETE /api/v1/files?path=subdir/filename.txt
func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	fullPath := filepath.Join(basePath, filepath.Clean(path))

	if err := os.RemoveAll(fullPath); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка удаления", http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, map[string]string{"status": "deleted"}, http.StatusOK)
}

// POST /api/v1/folders/create?path=subdir/newfolder
func CreateFolderHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	fullPath := filepath.Join(basePath, filepath.Clean(path))

	if err := os.MkdirAll(fullPath, 0755); err != nil {
		helpers.WriteErrorResponse(w, "Ошибка создания папки", http.StatusInternalServerError)
		return
	}
	helpers.WriteJSONResponse(w, map[string]string{"status": "created"}, http.StatusOK)
}
