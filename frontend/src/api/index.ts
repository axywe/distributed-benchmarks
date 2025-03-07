const BASE_URL = '/api/v1';

export interface APIResponse<T> {
  success: boolean;
  data: T;
  meta: {
    [key: string]: any;
  };
}

export interface OptimizationParameters {
  dimension: number;
  instance_id: number;
  n_iter: number;
  algorithm: number;
  seed: number;
  n_particles: number;
  inertia_start: number;
  inertia_end: number;
  nostalgia: number;
  societal: number;
  topology: string;
  tol_thres: number | null;
  tol_win: number;
}

export interface OptimizationResult {
  algorithm_name: string;
  algorithm_version: string;
  parameters: OptimizationParameters;
  expected_budget: number;
  actual_budget: number;
  best_result: {
    [key: string]: number;
  };
}

// POST /api/v1/optimization
export async function submitOptimization(
  params: OptimizationParameters
): Promise<OptimizationResult> {
  const response = await fetch(`${BASE_URL}/optimization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  const json: APIResponse<OptimizationResult> = await response.json();
  if (!json.success) {
    throw new Error(json.meta.message || 'Optimization submission failed');
  }
  return json.data;
}

// GET /api/v1/optimization/results/{id}
export async function getResultDetails(resultID: string): Promise<OptimizationResult> {
  const response = await fetch(`${BASE_URL}/optimization/results/${resultID}`);
  const json: APIResponse<OptimizationResult> = await response.json();
  if (!json.success) {
    throw new Error(json.meta.message || 'Result not found');
  }
  return json.data;
}
