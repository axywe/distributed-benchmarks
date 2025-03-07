package utils

import (
	"html/template"
	"os"
)

func LoadTemplate(path string) (*template.Template, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	t, err := template.New("form").Parse(string(content))
	if err != nil {
		return nil, err
	}
	return t, nil
}
