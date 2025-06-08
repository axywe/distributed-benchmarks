import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const searchContext = location.state?.searchContext as {
    algParams: Record<string, any>;
    methodParameters: Record<string, any>;
  } | undefined;

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/v1/optimization/results/${resultID}`);
        if (!response.ok) throw new Error(`${strings.resultDetails.request_error_prefix}${response.statusText}`);
        const json: OptimizationAPIResponse = await response.json();
        if (!json.success) throw new Error(strings.resultDetails.server_unsuccessful);
        setResult(json.data);
      } catch (err: any) {
        setError(err.message || strings.resultDetails.error_loading);
      }
    };
    fetchResult();
  }, [resultID]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/v1/optimization/results/${resultID}/download`);
      if (!response.ok) throw new Error(`${strings.resultDetails.file_loading_error}: ${response.statusText}`);
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
      alert(err.message || strings.resultDetails.file_loading_error);
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
        <Link to="/" className="btn btn-secondary">{strings.resultDetails.back}</Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{strings.resultDetails.spinner}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>{strings.resultDetails.result_id}{resultID!.toUpperCase()}</h1>
        <button
          className="btn btn-outline-secondary"
          onClick={() => setShowRaw(raw => !raw)}
        >
          {showRaw ? strings.resultDetails.formatted_view : strings.resultDetails.raw_view}
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
              <h5 className="card-title">{strings.resultDetails.title}</h5>
              <p><strong>{strings.resultDetails.algorithm}</strong> {result.algorithm_name} v{result.algorithm_version}</p>
              <p><strong>{strings.resultDetails.budget}</strong> {result.expected_budget} / {result.actual_budget}</p>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">{strings.resultDetails.parameters}</h5>
              <ul className="list-group list-group-flush">
                {searchContext && result ? (
                  (() => {
                    const allParamKeys = Array.from(new Set([
                      ...Object.keys(searchContext.methodParameters || {}),
                      ...Object.keys(result.parameters),
                    ])).sort();

                    return allParamKeys.map(key => {
                      const resultValue = result.parameters[key];
                      const searchParams = searchContext.algParams;
                      const methodParams = searchContext.methodParameters;

                      const wasInSearchInterface = key in (methodParams || {});
                      const isMissingInResult = wasInSearchInterface && resultValue === undefined;

                      let highlight = false;
                      let note = null;

                      if (wasInSearchInterface) {
                        const searchValue = searchParams?.[key];
                        const searchValEmpty = searchValue === null || searchValue === undefined || searchValue === '';

                        if ((searchValEmpty && (resultValue !== undefined && resultValue !== null)) ||
                            (!searchValEmpty && String(resultValue) !== String(searchValue))) {
                          highlight = true;
                          note = <span className="ms-2 fst-italic text-muted">(searched for: {searchValEmpty ? 'empty' : String(searchValue)})</span>;
                        }
                      }

                      let liClassName = "list-group-item";
                      if (highlight) {
                        liClassName += " list-group-item-info";
                      } else if (isMissingInResult) {
                        liClassName += " bg-light text-muted";
                      }

                      return (
                        <li key={key} className={liClassName}>
                          <strong>{formatLabel(key)}:</strong> {String(resultValue ?? (isMissingInResult ? 'Not set' : 'N/A'))}
                          {note}
                        </li>
                      );
                    });
                  })()
                ) : (
                  result && Object.entries(result.parameters).map(([key, val]) => (
                    <li key={key} className="list-group-item">
                      <strong>{formatLabel(key)}:</strong> {String(val)}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">{strings.resultDetails.best_result}</h5>
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
          {downloading ? strings.resultDetails.downloading : strings.resultDetails.download}
        </button>
        <Link to="/" className="btn btn-outline-secondary">{strings.resultDetails.back}</Link>
      </div>
    </div>
  );
};

export default ResultDetails;
