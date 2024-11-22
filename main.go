package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os/exec"
	"strings"
)

var formTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Parameter Input</title>
</head>
<body>
    <h1>Enter Parameters</h1>
    <form action="/submit" method="post">
        <label for="dimensions">Dimensions (default: 2 5 10):</label><br>
        <input type="text" id="dimensions" name="dimensions" value="2 5 10"><br><br>

        <label for="initial_samples">Initial Samples (default: 10 20):</label><br>
        <input type="text" id="initial_samples" name="initial_samples" value="10 20"><br><br>

        <label for="restarts">Restarts (default: 5 10):</label><br>
        <input type="text" id="restarts" name="restarts" value="5 10"><br><br>

        <label for="seeds">Seeds (default: 15):</label><br>
        <input type="text" id="seeds" name="seeds" value="15"><br><br>

        <label for="metrics">Metrics (default: NONE R2_CV SUIT_EXT VM_ANGLES_EXT):</label><br>
        <input type="checkbox" name="metrics" value="NONE" checked> NONE<br>
        <input type="checkbox" name="metrics" value="R2_CV" checked> R2_CV<br>
        <input type="checkbox" name="metrics" value="SUIT_EXT" checked> SUIT_EXT<br>
        <input type="checkbox" name="metrics" value="VM_ANGLES_EXT" checked> VM_ANGLES_EXT<br><br>

        <input type="submit" value="Send">
    </form>
</body>
</html>
`

func homeHandler(w http.ResponseWriter, r *http.Request) {
	t := template.New("form")
	t, err := t.Parse(formTemplate)
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
	dimensions := r.FormValue("dimensions")
	initialSamples := r.FormValue("initial_samples")
	restarts := r.FormValue("restarts")
	seeds := r.FormValue("seeds")
	metrics := r.Form["metrics"]

	// Build the ARGS string
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
