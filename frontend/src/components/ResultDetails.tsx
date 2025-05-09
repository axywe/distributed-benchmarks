import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { OptimizationResult } from '../api';
import strings from '../i18n';

interface OptimizationAPIResponse {
  success: boolean;
  data: OptimizationResult;
  meta?: any;
}

const ResultDetails: React.FC = () => {
  const { resultID } = useParams<{ resultID: string }>();
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/v1/optimization/results/${resultID}`);
        if (!response.ok) throw new Error(`Ошибка запроса: ${response.statusText}`);
        const json: OptimizationAPIResponse = await response.json();
        if (!json.success) throw new Error('Сервер вернул неуспешный ответ');
        setResult(json.data);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки результата.');
      }
    };
    fetchResult();
  }, [resultID]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/v1/optimization/results/${resultID}/download`);
      if (!response.ok) throw new Error(`Ошибка загрузки файла: ${response.statusText}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RESULT_${resultID!.toUpperCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки файла.');
    } finally {
      setDownloading(false);
    }
  };

  const formatLabel = (key: string) =>
    key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="btn btn-secondary">На главную</Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Result ID: {resultID!.toUpperCase()}</h1>
        <button
          className="btn btn-outline-secondary"
          onClick={() => setShowRaw(raw => !raw)}
        >
          {showRaw ? 'Formatted View' : 'Show Raw JSON'}
        </button>
      </div>

      {showRaw ? (
        <pre className="bg-light p-3 rounded" style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">General Information</h5>
              <p><strong>Algorithm:</strong> {result.algorithm_name} v{result.algorithm_version}</p>
              <p><strong>Budget:</strong> {result.expected_budget} / {result.actual_budget}</p>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Parameters</h5>
              <ul className="list-group list-group-flush">
                {Object.entries(result.parameters).map(([key, val]) => (
                  <li key={key} className="list-group-item">
                    <strong>{formatLabel(key)}:</strong> {String(val)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Best Result</h5>
              <ul className="list-group list-group-flush">
                {Object.entries(result.best_result).map(([key, val]) => (
                  <li key={key} className="list-group-item">
                    <strong>{formatLabel(key)}:</strong> {val.toFixed(6)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="d-flex gap-3">
        <button
          className="btn btn-success"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : 'Download CSV'}
        </button>
        <Link to="/" className="btn btn-outline-secondary">Back to Home</Link>
      </div>
    </div>
  );
};

export default ResultDetails;
