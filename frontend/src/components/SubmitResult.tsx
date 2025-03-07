import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

interface LocationState {
  result: {
    container_name: string;
  };
  resultID?: string;
}

const SubmitResult: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState;

  const [logs, setLogs] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    // Проверяем, что в state есть поле result, а в нём container_name
    if (!state?.result?.container_name) return;

    const containerName = state.result.container_name;
    console.log('Container Name:', containerName);

    // Подключаемся к SSE с указанным контейнером
    const evtSource = new EventSource('http://localhost:8080/api/v1/optimization/logs?container=' + containerName);

    evtSource.onmessage = (e) => {
      setLogs(prev => [...prev, e.data]);
    };

    evtSource.addEventListener('finish', (e) => {
      setFinished(true);
      setLogs(prev => [...prev, e.data]);
      evtSource.close();
    });

    evtSource.onerror = () => {
      if (!finished) {
        setLogs(prev => [...prev, 'Ошибка получения логов.']);
      }
      evtSource.close();
    };

    return () => {
      evtSource.close();
    };
  }, [state, finished]);

  return (
    <div className="container">
      <h1>Optimization Job Started</h1>
      <h2>
        Container Logs:{' '}
        {state?.result?.container_name || 'Не указан'}
      </h2>
      <div id="logs">
        {logs.map((log, idx) => (
          <div key={idx}>{log}</div>
        ))}
      </div>
      <div className="links" style={{ marginTop: '20px' }}>
        <Link to="/">Return to Home</Link>
        {finished && state?.resultID && (
          <span style={{ marginLeft: '20px' }}>
            <Link to={`/results/${state.resultID}`}>Go to Results</Link>
          </span>
        )}
      </div>
    </div>
  );
};

export default SubmitResult;
