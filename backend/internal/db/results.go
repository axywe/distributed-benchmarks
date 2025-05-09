package db

import (
	"database/sql"
	"fmt"
	"reflect"

	"github.com/lib/pq"
)

// OptimizationResult описывает результат и динамические входные параметры.
type OptimizationResult struct {
	AlgorithmName    string                 `json:"algorithm_name"`
	AlgorithmVersion string                 `json:"algorithm_version"`
	Parameters       map[string]interface{} `json:"parameters"`
	ExpectedBudget   int                    `json:"expected_budget"`
	ActualBudget     int                    `json:"actual_budget"`
	BestResult       map[string]float64     `json:"best_result"`
	ResultID         string                 `json:"result_id"`
}

// InsertOptimizationResult сохраняет результат в optimization_results
// и все ключи из Parameters — в optimization_input_parameters.
func InsertOptimizationResult(or OptimizationResult) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 0. Получаем method_id = algorithm
	rawAlgo, ok := or.Parameters["algorithm"]
	if !ok {
		return fmt.Errorf("отсутствует параметр 'algorithm'")
	}
	algoFloat, ok := rawAlgo.(float64)
	if !ok {
		return fmt.Errorf("'algorithm' должен быть числом")
	}
	methodID := int(algoFloat)

	// 1. Извлекаем обязательные параметры
	intParams := []string{"dimension", "instance_id", "n_iter", "seed"}
	values := make(map[string]int)
	for _, name := range intParams {
		raw, ok := or.Parameters[name]
		if !ok {
			return fmt.Errorf("обязательный параметр '%s' отсутствует", name)
		}
		f, ok := raw.(float64)
		if !ok {
			return fmt.Errorf("параметр '%s' должен быть числом", name)
		}
		values[name] = int(f)
	}

	// 2. Вставляем сам результат
	_, err = tx.Exec(`
INSERT INTO optimization_results
  (result_id, method_id, algorithm_name, algorithm_version,
   dimension, instance_id, n_iter, algorithm, seed,
   expected_budget, actual_budget, best_result_x, best_result_f)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
`,
		or.ResultID,
		methodID,
		or.AlgorithmName,
		or.AlgorithmVersion,
		values["dimension"],
		values["instance_id"],
		values["n_iter"],
		methodID,
		values["seed"],
		or.ExpectedBudget,
		or.ActualBudget,
		pq.Array(parseBestX(or.BestResult)),
		parseBestF(or.BestResult),
	)
	if err != nil {
		return fmt.Errorf("insert optimization_results: %v", err)
	}

	// 3. Вставляем все параметры в optimization_input_parameters
	for name, val := range or.Parameters {
		var txt string
		var num sql.NullFloat64
		var typ string

		rv := reflect.ValueOf(val)
		switch rv.Kind() {
		case reflect.Float64:
			f := rv.Float()
			txt = fmt.Sprint(f)
			num = sql.NullFloat64{Float64: f, Valid: true}
			typ = "float"
		case reflect.String:
			txt = rv.String()
			num = sql.NullFloat64{Valid: false}
			typ = "string"
		case reflect.Bool:
			b := rv.Bool()
			txt = fmt.Sprint(b)
			num = sql.NullFloat64{Valid: false}
			typ = "bool"
		default:
			txt = fmt.Sprint(val)
			num = sql.NullFloat64{Valid: false}
			typ = "string"
		}

		if _, err := tx.Exec(`
INSERT INTO optimization_input_parameters
  (result_id, name, value_text, value_numeric, type)
VALUES ($1,$2,$3,$4,$5)
ON CONFLICT (result_id,name) DO UPDATE
  SET value_text = EXCLUDED.value_text,
      value_numeric = EXCLUDED.value_numeric
`,
			or.ResultID, name, txt, num, typ,
		); err != nil {
			return fmt.Errorf("insert input param %s: %v", name, err)
		}
	}

	return tx.Commit()
}

func parseBestX(br map[string]float64) []float64 {
	xs := []float64{}
	for i := 0; ; i++ {
		key := fmt.Sprintf("x[%d]", i)
		v, ok := br[key]
		if !ok {
			break
		}
		xs = append(xs, v)
	}
	return xs
}

func parseBestF(br map[string]float64) float64 {
	return br["f[1]"]
}
