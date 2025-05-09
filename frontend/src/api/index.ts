const BASE_URL = '/api/v1';

export interface OptimizationParameters {
  [key: string]: any;
}

export interface OptimizationResult {
  result_id: string;
  algorithm_name: string;
  algorithm_version: string;
  parameters: Record<string, any>;
  expected_budget: number;
  actual_budget: number;
  best_result: Record<string, number>;
}

// Новый формат ответа для POST
export interface SubmitOptimizationResponse {
  success: boolean;
  data: {
    cached: boolean;
    matches?: OptimizationResult[];
    container_name?: string;
  };
  meta?: any;
}

export async function submitOptimization(
  params: OptimizationParameters
): Promise<SubmitOptimizationResponse['data']> {
  const res = await fetch(`${BASE_URL}/optimization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json: SubmitOptimizationResponse = await res.json();
  if (!json.success) {
    throw new Error(json.meta?.message || 'Submit failed');
  }
  return json.data;
}
