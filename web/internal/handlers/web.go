package handlers

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"

	"gitlab.com/Taleh/distributed-benchmarks/internal/utils"
)

var tmpl *template.Template
var submitTmpl *template.Template

func SetTemplate(t *template.Template) {
	tmpl = t
}

func SetSubmitTemplate(t *template.Template) {
	submitTmpl = t
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	if tmpl == nil {
		http.Error(w, "Внутренняя ошибка сервера", http.StatusInternalServerError)
		return
	}
	if err := tmpl.Execute(w, nil); err != nil {
		log.Printf("Ошибка при выполнении шаблона: %v", err)
		http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
	}
}

func SubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Не удалось обработать данные формы", http.StatusBadRequest)
		return
	}

	argsList, err := utils.BuildArgs(r)
	if err != nil {
		http.Error(w, fmt.Sprintf("Ошибка валидации: %v", err), http.StatusBadRequest)
		return
	}

	output, err := utils.RunCommand(argsList)
	if err != nil {
		log.Printf("Ошибка выполнения команды: %v\nВывод: %s\n", err, string(output))
		http.Error(w, fmt.Sprintf("Ошибка выполнения команды: %v", err), http.StatusInternalServerError)
		return
	}

	outputStr := string(output)

	lines := strings.Split(strings.TrimSpace(outputStr), "\n")

	var containerName string
	if len(lines) > 0 {
		containerName = lines[len(lines)-1]
	}

	log.Println("Container Name:", containerName)
	data := struct {
		Output        string
		ContainerName string
	}{
		Output:        string(output),
		ContainerName: containerName,
	}

	if submitTmpl == nil {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(data.Output))
		return
	}
	if err := submitTmpl.Execute(w, data); err != nil {
		log.Printf("Ошибка выполнения шаблона результата: %v", err)
		http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
	}
}
