// db/search.go
package db

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

// SearchOptimizationResults ищет все result_id, у которых динамические параметры попадают ±10% (числа)
// или точно совпадают (строки), а затем для каждого возвращает полный OptimizationResult.
func SearchOptimizationResults(params map[string]interface{}) ([]OptimizationResult, error) {
	// Построим CTE + INTERSECT, чтобы получить список подходящих result_id
	var cteBlocks []string
	var intersectParts []string
	var args []interface{}
	idx := 1
	paramCount := 0

	for name, raw := range params {
		var clause string
		switch v := raw.(type) {
		case int, float64:
			f := toFloat(v)
			lower := f * 0.9
			upper := f * 1.1
			clause = fmt.Sprintf(
				"SELECT result_id FROM optimization_input_parameters "+
					"WHERE name = '%s' AND value_numeric BETWEEN $%d AND $%d",
				name, idx, idx+1,
			)
			args = append(args, lower, upper)
			idx += 2

		case string:
			clause = fmt.Sprintf(
				"SELECT result_id FROM optimization_input_parameters "+
					"WHERE name = '%s' AND value_text = $%d",
				name, idx,
			)
			args = append(args, v)
			idx++
		default:
			// пропускаем все прочие типы
			continue
		}

		paramCount++
		cteName := fmt.Sprintf("p%d", paramCount)
		cteBlocks = append(cteBlocks, fmt.Sprintf("%s AS (%s)", cteName, clause))
		intersectParts = append(intersectParts, fmt.Sprintf("SELECT result_id FROM %s", cteName))
	}

	var resultIDs []string
	if paramCount == 0 {
		// без фильтров — сразу все ID
		rows, err := DB.Query(`SELECT result_id FROM optimization_results`)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				return nil, err
			}
			resultIDs = append(resultIDs, id)
		}
	} else {
		// CTE + INTERSECT
		cte := "WITH " + strings.Join(cteBlocks, ", ") + ", ids AS (" +
			strings.Join(intersectParts, " INTERSECT ") +
			") SELECT result_id FROM ids"

		rows, err := DB.Query(cte, args...)
		if err != nil {
			return nil, fmt.Errorf("search query: %v", err)
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				return nil, err
			}
			resultIDs = append(resultIDs, id)
		}
	}

	// Для каждого найденного ID грузим полный OptimizationResult
	var results []OptimizationResult
	for _, id := range resultIDs {
		or, err := LoadOptimizationResult(id)
		if err != nil {
			return nil, err
		}
		results = append(results, or)
	}
	return results, nil
}

// LoadOptimizationResult читает из двух таблиц весь объём данных для данного result_id.
func LoadOptimizationResult(resultID string) (OptimizationResult, error) {
	var or OptimizationResult
	or.ResultID = resultID
	or.Parameters = make(map[string]interface{})

	// 1) Сначала базовые поля из optimization_results
	var bestX []float64
	var bestF float64

	row := DB.QueryRow(`
SELECT algorithm_name, algorithm_version,
       expected_budget, actual_budget,
       best_result_x, best_result_f
FROM optimization_results
WHERE result_id = $1
`, resultID)

	if err := row.Scan(
		&or.AlgorithmName,
		&or.AlgorithmVersion,
		&or.ExpectedBudget,
		&or.ActualBudget,
		pq.Array(&bestX),
		&bestF,
	); err != nil {
		if err == sql.ErrNoRows {
			return or, fmt.Errorf("result %s not found", resultID)
		}
		return or, err
	}

	or.BestResult = make(map[string]float64, len(bestX)+1)
	for i, x := range bestX {
		or.BestResult[fmt.Sprintf("x[%d]", i)] = x
	}
	or.BestResult["f[1]"] = bestF

	// 2) Теперь все входные параметры из optimization_input_parameters
	rows, err := DB.Query(`
SELECT name, value_text, value_numeric, type
FROM optimization_input_parameters
WHERE result_id = $1
`, resultID)
	if err != nil {
		return or, err
	}
	defer rows.Close()

	for rows.Next() {
		var name, valueText, typ string
		var valueNumeric sql.NullFloat64

		if err := rows.Scan(&name, &valueText, &valueNumeric, &typ); err != nil {
			return or, err
		}

		switch typ {
		case "float":
			if valueNumeric.Valid {
				or.Parameters[name] = valueNumeric.Float64
			} else {
				or.Parameters[name] = nil
			}
		case "int":
			if valueNumeric.Valid {
				or.Parameters[name] = int(valueNumeric.Float64)
			} else {
				or.Parameters[name] = nil
			}
		case "bool":
			or.Parameters[name] = (valueText == "true")
		default:
			// string и всё прочее
			or.Parameters[name] = valueText
		}
	}

	return or, nil
}

func toFloat(v interface{}) float64 {
	switch x := v.(type) {
	case int:
		return float64(x)
	case float64:
		return x
	}
	return 0
}
