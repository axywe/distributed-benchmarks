import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResultDetails, OptimizationResult } from '../api';

const ResultDetails: React.FC = () => {
  const { resultID } = useParams<{ resultID: string }>();
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await getResultDetails(resultID!);
        setResult(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchResult();
  }, [resultID]);

  if (error) {
    return (
      <div className="container">
        <p>{error}</p>
        <Link to="/">Return to Home</Link>
      </div>
    );
  }

  if (!result) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Optimization Result Details</h1>
      <div className="result-summary">
        <p><strong>Result ID:</strong> {resultID}</p>
        <p><strong>Algorithm:</strong> {result.algorithm_name}</p>
      </div>
      <a className="download-link" href={`/api/v1/optimization/results/${resultID}/download`}>Download results.csv</a>
      <p><Link to="/">Return to Home</Link></p>
    </div>
  );
};

export default ResultDetails;
