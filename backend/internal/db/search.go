package db

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

type NumericRange struct {
	Min float64
	Max float64
}

func SearchOptimizationResults(params map[string]interface{}) ([]OptimizationResult, error) {
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
			continue
		}

		paramCount++
		cteName := fmt.Sprintf("p%d", paramCount)
		cteBlocks = append(cteBlocks, fmt.Sprintf("%s AS (%s)", cteName, clause))
		intersectParts = append(intersectParts, fmt.Sprintf("SELECT result_id FROM %s", cteName))
	}

	var resultIDs []string
	if paramCount == 0 {
		rows, err := DB.Query(`SELECT result_id FROM optimization_results ORDER BY best_result_f`)
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
		cte := "WITH " + strings.Join(cteBlocks, ", ") + ", ids AS (" +
			strings.Join(intersectParts, " INTERSECT ") +
			") SELECT ids.result_id FROM ids JOIN optimization_results ON optimization_results.result_id = ids.result_id ORDER BY optimization_results.best_result_f"

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

func SearchOptimizationResultsWithRange(params map[string]interface{}) ([]OptimizationResult, error) {
    var cteBlocks []string
    var intersectParts []string
    var args []interface{}
    idx := 1
    paramCount := 0

    for name, raw := range params {
        var clause string

        switch v := raw.(type) {

        case []NumericRange:
            // несколько диапазонов для одного параметра
            var ors []string
            for _, nr := range v {
                ors = append(ors,
                    fmt.Sprintf("value_numeric BETWEEN $%d AND $%d", idx, idx+1),
                )
                args = append(args, nr.Min, nr.Max)
                idx += 2
            }
            clause = fmt.Sprintf(
                "SELECT result_id FROM optimization_input_parameters "+
                    "WHERE name = '%s' AND (%s)",
                name, strings.Join(ors, " OR "),
            )

        case []string:
            // несколько текстовых значений
            var ph []string
            for _, txt := range v {
                ph = append(ph, fmt.Sprintf("$%d", idx))
                args = append(args, txt)
                idx++
            }
            clause = fmt.Sprintf(
                "SELECT result_id FROM optimization_input_parameters "+
                    "WHERE name = '%s' AND value_text IN (%s)",
                name, strings.Join(ph, ","),
            )

        case int, float64:
            // старый режим: единичное число ±10%
            f := toFloat(v)
            low := f * 0.9
            high := f * 1.1
            clause = fmt.Sprintf(
                "SELECT result_id FROM optimization_input_parameters "+
                    "WHERE name = '%s' AND value_numeric BETWEEN $%d AND $%d",
                name, idx, idx+1,
            )
            args = append(args, low, high)
            idx += 2

        case string:
            // старый режим: точное текстовое совпадение
            clause = fmt.Sprintf(
                "SELECT result_id FROM optimization_input_parameters "+
                    "WHERE name = '%s' AND value_text = $%d",
                name, idx,
            )
            args = append(args, v)
            idx++

        default:
            // пропускаем
            continue
        }

        paramCount++
        cteName := fmt.Sprintf("p%d", paramCount)
        cteBlocks = append(cteBlocks, fmt.Sprintf("%s AS (%s)", cteName, clause))
        intersectParts = append(intersectParts, fmt.Sprintf("SELECT result_id FROM %s", cteName))
    }

    var resultIDs []string
    if paramCount == 0 {
        // без фильтров — все, отсортированные
        rows, err := DB.Query(`SELECT result_id FROM optimization_results ORDER BY best_result_f`)
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
        // пересечение всех CTE
        cte := "WITH " + strings.Join(cteBlocks, ", ") + ", ids AS (" +
            strings.Join(intersectParts, " INTERSECT ") +
            ") SELECT ids.result_id FROM ids "+
            "JOIN optimization_results ON optimization_results.result_id = ids.result_id "+
            "ORDER BY optimization_results.best_result_f"

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

func LoadOptimizationResult(resultID string) (OptimizationResult, error) {
	var or OptimizationResult
	or.ResultID = resultID
	or.Parameters = make(map[string]interface{})

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
