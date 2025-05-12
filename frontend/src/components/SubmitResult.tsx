import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import strings from '../i18n';

interface LocationState {
  result: {
    container_name: string;
  };
}

const SubmitResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const rawContainer = state?.result?.container_name || '';
  const resultID = rawContainer.split('-').pop() || '';

  const [logs, setLogs] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!rawContainer) return;
  
    const evtSource = new EventSource(
      `/api/v1/optimization/logs?container=${rawContainer}`
    );
  
    evtSource.onmessage = (e) => {
      setLogs((prev) => [...prev, e.data]);
      if (e.data.includes(strings.submitResult.finished_message)) {
        setFinished(true);
      }
    };
  
    evtSource.addEventListener('finish', (e) => {
      setFinished(true);
      setLogs((prev) => [...prev, e.data]);
      evtSource.close();
    });
  
    evtSource.onerror = () => {
      setLogs((prev) => [...prev, strings.submitResult.log_error]);
      evtSource.close();
    };
  
    return () => {
      evtSource.close();
    };
  }, [rawContainer]);
  

  return (
    <div className="container mt-4">
      <h1 className="mb-3">
        {strings.submitResult.job_id} {resultID || strings.submitResult.not_specified}
      </h1>

      <div className="mb-3">
        <h5>{strings.submitResult.container_logs}</h5>
        <div
          className="border bg-light p-3 rounded"
          style={{ height: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
        >
          {logs.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link to="/" className="btn btn-outline-secondary">
        {strings.submitResult.back}
        </Link>
        <button
          className="btn btn-primary"
          disabled={!finished}
          onClick={() => navigate(`/results/${resultID}`)}
        >
          {finished ? strings.submitResult.view_result : strings.submitResult.waiting}
        </button>
      </div>
    </div>
  );
};

export default SubmitResult;
