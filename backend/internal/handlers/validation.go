package handlers

import "fmt"

func ValidateCoreFields(m map[string]interface{}) error {
	required := []string{"dimension", "instance_id", "n_iter", "seed"}
	for _, key := range required {
		val, ok := m[key]
		if !ok {
			return fmt.Errorf("не указан параметр %s", key)
		}

		num, ok := val.(float64)
		if !ok {
			return fmt.Errorf("некорректный тип для %s", key)
		}
		if num < 0 {
			return fmt.Errorf("параметр %s должен быть неотрицательным", key)
		}
		if (key == "dimension" || key == "n_iter") && num <= 0 {
			return fmt.Errorf("параметр %s должен быть > 0", key)
		}
	}
	return nil
}
