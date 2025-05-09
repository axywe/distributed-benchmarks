import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import strings from '../i18n';

interface OptimizationResult {
  result_id: string;
  algorithm_name: string;
  algorithm_version: string;
  expected_budget: number;
  actual_budget: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

const ResultsHistory: React.FC = () => {
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 10;
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

    const formatTimestamp = (id: string) => {
        const raw = Number(id);
        if (isNaN(raw)) return id;
    
        const timestampMs =
        raw > 1e15 ? Math.floor(raw / 1_000_000) : 
        raw > 1e12 ? Math.floor(raw / 1_000)      : 
                    raw;                         
    
        const date = new Date(timestampMs);
        return isNaN(date.getTime()) ? id : date.toLocaleString();
    };
  

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = page * limit;
        const res = await fetch(
          `/api/v1/optimization/results?limit=${limit}&offset=${offset}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) {
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error(res.statusText);
        const json = (await res.json()) as ApiResponse<OptimizationResult[]>;
        setResults(json.data);
      } catch (e: any) {
        setError(e.message || 'History loading error.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [page, token, navigate]);

  return (
    <div className="container mt-4">
      <h2>History</h2>

      {loading && <p>Loading…</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Algorithm</th>
                <th>Budget</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.result_id}>
                  <td>{formatTimestamp(r.result_id)}</td>
                  <td>
                    {r.algorithm_name} v{r.algorithm_version}
                  </td>
                  <td>
                    {r.expected_budget} / {r.actual_budget}
                  </td>
                  <td>
                    <Link
                      to={`/results/${r.result_id}`}
                      className="btn btn-sm btn-primary"
                    >
                    Details
                    </Link>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    There are no results yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="d-flex justify-content-between">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage(p => Math.max(p - 1, 0))}
              disabled={page === 0}
            >
              ← Back
            </button>
            <span>Page {page + 1}</span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage(p => p + 1)}
              disabled={results.length < limit}
            >
              Forward →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsHistory;
