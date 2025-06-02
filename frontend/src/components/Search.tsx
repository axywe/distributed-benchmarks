import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [problem, setProblem] = useState<{ dimension: number | null; instance_id: number | null }>({ dimension: 2, instance_id: 0 });
  const [algParams, setAlgParams] = useState<Record<string, any>>({});
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addConfigStatus, setAddConfigStatus] = useState<'idle' | 'adding' | 'added'>('idle');
  const [loading, setLoading] = useState(false);
  const [addStatus, setAddStatus] = useState<Record<string, 'idle'|'adding'|'added'>>({});
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const navigate = useNavigate();
  const [selectedProblem, setSelectedProblem] = useState('bbob');

  // Load available methods
  useEffect(() => {
    fetch('/api/v1/methods')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setMethods(json.data);
        else setMethods([]);
      });
  }, []);

  // Initialize algParams when a method is selected
  useEffect(() => {
    if (!selectedMethod) return;
    const init: Record<string, any> = {};
    Object.entries(selectedMethod.parameters).forEach(([k, m]) => {
      init[k] = m.default != null ? m.default : (m.nullable ? null : '');
    });
    setAlgParams(init);
    setErrors({});
    setAddConfigStatus('idle');
  }, [selectedMethod]);

  const handleProblemSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedProblem(e.target.value);
  };

  const handleProblemChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProblem(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value),
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
      [name]: value === '' ? null : value,
    }));
  };

  const validateConfig = () => {
    const errs: Record<string, string> = {};

    // Problem fields
    if (problem.dimension == null) {
      errs['dimension'] = 'Dimension is required';
    } else if (!Number.isInteger(problem.dimension)) {
      errs['dimension'] = 'Dimension must be an integer';
    }

    if (problem.instance_id == null) {
      errs['instance_id'] = 'Instance ID is required';
    } else if (!Number.isInteger(problem.instance_id)) {
      errs['instance_id'] = 'Instance ID must be an integer';
    }

    // Algorithm selection
    if (!selectedMethod) {
      errs['algorithm'] = 'Please select an algorithm';
    }

    // Algorithm parameters
    if (selectedMethod) {
      Object.entries(selectedMethod.parameters).forEach(([key, meta]) => {
        const v = algParams[key];
        if ((v === null || v === '') && !meta.nullable) {
          errs[key] = `${key} is required`;
          return;
        }
        if (v != null && v !== '') {
          if (meta.type === 'int') {
            const n = Number(v);
            if (isNaN(n) || !Number.isInteger(n)) {
              errs[key] = `${key} must be an integer`;
            }
          } else if (meta.type === 'float') {
            const f = Number(v);
            if (isNaN(f)) {
              errs[key] = `${key} must be a float`;
            }
          }
          // string type always valid
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddConfig = () => {
    if (!validateConfig() || !selectedMethod) {
      return;
    }

    setAddConfigStatus('adding');

    // Build Experiment
    const { dimension, instance_id } = problem;
    const { seed, ...restParams } = algParams;
    const exp: Experiment = {
      id: Date.now().toString(),
      dimension: Number(dimension),
      instance_id: Number(instance_id),
      algorithm: selectedMethod.id,
      seed: seed != null ? Number(seed) : 0,
      params: restParams,
      algorithmName: selectedMethod.name,
    };

    // Save to localStorage
    const saved = localStorage.getItem('savedExperiments');
    const arr: Experiment[] = saved ? JSON.parse(saved) : [];
    arr.push(exp);
    localStorage.setItem('savedExperiments', JSON.stringify(arr));

    setAddConfigStatus('added');
    setTimeout(() => {
      setAddConfigStatus('idle');
    }, 1000);
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
    const json = (await res.json()) as { success: boolean; data: SearchResult[] };
    setResults(json.success ? json.data : []);
    setLoading(false);
  };

  const handleAddResult = (r: SearchResult) => {
    setAddStatus(s => ({ ...s, [r.result_id]: 'adding' }));
    const p = { ...r.parameters };
    const { dimension, instance_id, algorithm, seed, user_id, ...rest } = p;
    const exp: Experiment = {
      id: Date.now().toString(),
      dimension: Number(dimension),
      instance_id: Number(instance_id),
      algorithm: Number(algorithm),
      seed: Number(seed),
      params: rest,
      algorithmName: r.algorithm_name,
    };
    const saved = localStorage.getItem('savedExperiments');
    const arr: Experiment[] = saved ? JSON.parse(saved) : [];
    arr.push(exp);
    localStorage.setItem('savedExperiments', JSON.stringify(arr));
    setAddStatus(s => ({ ...s, [r.result_id]: 'added' }));
    if (timeouts.current[r.result_id]) {
      clearTimeout(timeouts.current[r.result_id]);
    }
    timeouts.current[r.result_id] = setTimeout(() => {
      setAddStatus(s => ({ ...s, [r.result_id]: 'idle' }));
      delete timeouts.current[r.result_id];
    }, 1000);
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{strings.search.title}</h1>

      <div>
        <h2>{strings.search.problem_section}</h2>
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">{strings.search.problem}</label>
            <select
              className={`form-select ${errors['algorithm'] ? 'is-invalid' : ''}`}
              value={selectedProblem}
              onChange={handleProblemSelect}
            >
              <option value="bbob">BBOB</option>
            </select>
            {errors['algorithm'] && <div className="invalid-feedback">{errors['algorithm']}</div>}
          </div>
          {(['dimension', 'instance_id'] as const).map(key => (
            <div key={key} className="col-md-3">
              <label className="form-label">{key}</label>
              <input
                className={`form-control ${errors[key] ? 'is-invalid' : ''}`}
                name={key}
                type="number"
                value={problem[key] ?? ''}
                onChange={handleProblemChange}
              />
              {errors[key] && <div className="invalid-feedback">{errors[key]}</div>}
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
              className={`form-select ${errors['algorithm'] ? 'is-invalid' : ''}`}
              value={selectedMethod?.id || ''}
              onChange={handleAlgorithmSelect}
            >
              <option value="">{strings.search.select_algorithm}</option>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {errors['algorithm'] && <div className="invalid-feedback">{errors['algorithm']}</div>}
          </div>
          {selectedMethod && Object.entries(selectedMethod.parameters).map(([name, meta]) => (
            <div key={name} className="col-md-4">
              <label className="form-label">{name}</label>
              <input
                className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                name={name}
                type="text"
                value={algParams[name] == null ? '' : algParams[name]}
                placeholder={meta.nullable ? strings.home.none : ''}
                onChange={handleParamChange}
              />
              {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? strings.search.searching : strings.search.search}
          </button>
          <button
            className="btn btn-success ms-2"
            onClick={handleAddConfig}
            disabled={addConfigStatus === 'adding'}
          >
            {addConfigStatus === 'adding'
              ? strings.search.adding
              : addConfigStatus === 'added'
                ? strings.search.added
                : strings.search.add}
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
            {results?.map(r => (
              <tr key={r.result_id}>
                <td>{r.result_id}</td>
                <td>{r.best_result['f[1]'].toFixed(6)}</td>
                <td>
                  <button
                    className="btn btn-sm btn-success"
                    style={{ minWidth: '6rem' }}
                    onClick={() => handleAddResult(r)}
                    disabled={addStatus[r.result_id] === 'adding'}
                  >
                    {addStatus[r.result_id] === 'adding'
                      ? strings.search.adding
                      : addStatus[r.result_id] === 'added'
                        ? strings.search.added
                        : strings.search.add}
                  </button>
                  <button
                    className="btn btn-sm btn-info ms-2"
                    onClick={() => navigate(`/results/${r.result_id}`)}
                  >
                    {strings.search.view_result}
                  </button>
                </td>
              </tr>
            ))}
            {(results?.length === 0 || results === null) && (
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
