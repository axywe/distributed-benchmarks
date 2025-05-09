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

export interface SubmitOptimizationResponse {
  success: boolean;
  data: {
    cached: boolean;
    matches?: OptimizationResult[];
    container_name?: string;
  };
  meta?: any;
}
export interface User {
  id: number;
  login: string;
  password: string;
  group: string;
}

export async function submitOptimization(
  params: OptimizationParameters
): Promise<SubmitOptimizationResponse['data']> {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}/optimization`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(params),
  });
  const json: SubmitOptimizationResponse = await res.json();
  if (!json.success) {
    throw new Error(json.meta?.message || 'Submit failed');
  }
  return json.data;
}

export async function getCurrentUser(): Promise<User> {
  const token = localStorage.getItem('authToken');
  const res = await fetch('/api/v1/user', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  return json.data;
}

