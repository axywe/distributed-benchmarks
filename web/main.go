package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

func loadFormTemplate() (string, error) {
	content, err := os.ReadFile("web/index.html")
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	formTemplate, err := loadFormTemplate()
	t := template.New("form")
	t, err = t.Parse(formTemplate)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	t.Execute(w, nil)
}

func submitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Failed to parse form data.", http.StatusBadRequest)
		return
	}

	// TODO: Parse JSON
	// TODO: Transfer JSON to makefile arguments

	dimensions := r.FormValue("dimensions")
	initialSamples := r.FormValue("initial_samples")
	restarts := r.FormValue("restarts")
	seeds := r.FormValue("seeds")
	metrics := r.Form["metrics"]

	var argsList []string

	if dimensions != "" {
		argsList = append(argsList, "--dimensions")
		argsList = append(argsList, strings.Fields(dimensions)...)
	}

	if initialSamples != "" {
		argsList = append(argsList, "--initial_samples")
		argsList = append(argsList, strings.Fields(initialSamples)...)
	}

	if restarts != "" {
		argsList = append(argsList, "--restarts")
		argsList = append(argsList, strings.Fields(restarts)...)
	}

	if seeds != "" {
		argsList = append(argsList, "--seeds")
		argsList = append(argsList, seeds)
	}

	if len(metrics) > 0 {
		argsList = append(argsList, "--metrics")
		argsList = append(argsList, metrics...)
	}

	argsString := strings.Join(argsList, " ")

	// TODO: Run docker from Golang w/o using exec
	cmd := exec.Command("make", "docker", fmt.Sprintf("ARGS=%s", argsString))
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error: %s\nOutput: %s\n", err, string(output))
	}
	fmt.Printf("Output:\n%s\n", string(output))
}

func main() {
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/submit", submitHandler)
	fmt.Println("Starting server at :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
