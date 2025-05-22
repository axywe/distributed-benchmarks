// src/components/SearchAlgorithms.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import strings from '../i18n';

interface MethodParam {
  type: 'int' | 'float' | 'string';
  default: any;
  nullable?: boolean;
}

interface OptimizationMethod {
  id: number;
  name: string;
  parameters: Record<string, MethodParam>;
  file_path: string | null;
}

interface SearchResult {
  user_id: number;
  algorithm_name: string;
  algorithm_version: string;
  parameters: Record<string, any>;
  expected_budget: number;
  actual_budget: number;
  best_result: Record<string, number>;
  result_id: string;
}

interface Experiment {
  id: string;
  dimension: number;
  instance_id: number;
  algorithm: number;
  seed: number;
  params: Record<string, any>;
  algorithmName: string;
}

const SearchAlgorithms: React.FC = () => {
  const [methods, setMethods] = useState<OptimizationMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<OptimizationMethod | null>(null);
  const [problem, setProblem] = useState({ dimension: 2, instance_id: 0 });
  const [algParams, setAlgParams] = useState<Record<string, any>>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/methods')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setMethods(json.data);
        else setMethods([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedMethod) return;
    const dyn: Record<string, any> = {};
    Object.entries(selectedMethod.parameters).forEach(([k, m]) => {
      dyn[k] = m.default != null ? m.default : (m.nullable ? null : '');
    });
    setAlgParams(dyn);
  }, [selectedMethod]);

  const handleProblemChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProblem(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value)
    }));
  };

  const handleAlgorithmSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedMethod(methods.find(m => m.id === id) || null);
  };

  const handleParamChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAlgParams(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  const handleSearch = async () => {
    if (!selectedMethod) return;
    setLoading(true);
    const qp = new URLSearchParams();
    qp.set('dimension', String(problem.dimension));
    qp.set('instance_id', String(problem.instance_id));
    qp.set('algorithm', String(selectedMethod.id));
    Object.entries(algParams).forEach(([k, v]) => {
      if (v !== null && v !== '') qp.set(k, String(v));
    });
    const res = await fetch('/api/v1/optimization/search?' + qp.toString());
    const json = await res.json() as { success: boolean; data: SearchResult[] };
    setResults(json.success ? json.data : []);
    setLoading(false);
  };

  const handleAdd = (r: SearchResult) => {
    const p = { ...r.parameters };
    const { dimension, instance_id, algorithm, seed, ...rest } = p;
    const exp: Experiment = {
      id: Date.now().toString(),
      dimension: Number(dimension),
      instance_id: Number(instance_id),
      algorithm: Number(algorithm),
      seed: Number(seed),
      params: rest,
      algorithmName: r.algorithm_name
    };
    const saved = localStorage.getItem('savedExperiments');
    const arr: Experiment[] = saved ? JSON.parse(saved) : [];
    arr.push(exp);
    localStorage.setItem('savedExperiments', JSON.stringify(arr));
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{strings.search.title}</h1>

      <div>
        <h2>{strings.search.problem_section}</h2>
        <div className="row g-3">
        {(['dimension', 'instance_id'] as const).map(key => (
            <div key={key} className="col-md-3">
              <label className="form-label">{key}</label>
              <input
                className="form-control"
                name={key}
                type="number"
                value={problem[key]}
                onChange={handleProblemChange}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <h2>{strings.search.algorithm_section}</h2>
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">{strings.search.algorithm}</label>
            <select
              className="form-select"
              value={selectedMethod?.id || ''}
              onChange={handleAlgorithmSelect}
            >
              <option value="">{strings.search.select_algorithm}</option>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          {selectedMethod && Object.entries(selectedMethod.parameters).map(([name, meta]) => (
            <div key={name} className="col-md-4">
                <label className="form-label">{name}</label>
                <input
                className="form-control"
                name={name}
                type="text"
                value={algParams[name] == null ? '' : algParams[name]}
                placeholder={meta.nullable ? strings.home.none : ''}
                onChange={handleParamChange}
                />
            </div>
            ))}

        </div>
        <div className="mt-3">
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? strings.search.searching : strings.search.search}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h2>{strings.search.experiments_section}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{strings.search.result_id}</th>
              <th>{strings.search.best_f}</th>
              <th>{strings.search.actions}</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.result_id}>
                <td>{r.result_id}</td>
                <td>{r.best_result['f[1]'].toFixed(6)}</td>
                <td>
                  <button className="btn btn-sm btn-success" onClick={() => handleAdd(r)}>
                    {strings.search.add}
                  </button>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  {strings.search.no_results}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SearchAlgorithms;
