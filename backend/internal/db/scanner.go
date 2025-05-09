package db

import (
	"encoding/json"
	"io/fs"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ScanResultsFolder обходит каталог, находит results.json и пушит их в БД.
func ScanResultsFolder(resultsDir string) error {
	return filepath.WalkDir(resultsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		// пропускаем уже обработанные папки
		if d.IsDir() && strings.HasSuffix(d.Name(), ".processed") {
			return filepath.SkipDir
		}
		if !d.IsDir() && d.Name() == "results.json" {
			data, err := ioutil.ReadFile(path)
			if err != nil {
				log.Printf("Ошибка чтения %s: %v", path, err)
				return nil
			}
			var res OptimizationResult
			if err := json.Unmarshal(data, &res); err != nil {
				log.Printf("Ошибка парсинга JSON %s: %v", path, err)
				return nil
			}
			parent := filepath.Dir(path)
			res.ResultID = filepath.Base(parent)

			if err := InsertOptimizationResult(res); err != nil {
				log.Printf("Ошибка вставки %s: %v", path, err)
				return nil
			}
			log.Printf("Вставлен результат из %s", path)

			newDir := parent + ".processed"
			if err := os.Rename(parent, newDir); err != nil {
				log.Printf("Ошибка переименования %s: %v", parent, err)
			}
		}
		return nil
	})
}

// StartCronTask запускает ScanResultsFolder каждые interval.
func StartCronTask(resultsDir string, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			if err := ScanResultsFolder(resultsDir); err != nil {
				log.Printf("Ошибка при сканировании: %v", err)
			}
		}
	}()
}
