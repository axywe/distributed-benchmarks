import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitOptimization } from '../api';
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

interface Experiment {
  id: string;
  dimension: number;
  instance_id: number;
  algorithm: number;
  seed: number;
  params: Record<string, any>;
  algorithmName: string;
}

const Home: React.FC = () => {
  const [methods, setMethods] = useState<OptimizationMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<OptimizationMethod | null>(null);
  const [problem, setProblem] = useState({ dimension: 2, instance_id: 0 });
  const [seed, setSeed] = useState(0);
  const [algorithmParams, setAlgorithmParams] = useState<Record<string, any>>({});
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);

  const [showMultiModal, setShowMultiModal] = useState(false);
  const [multiResults, setMultiResults] = useState<Array<{ experiment: Experiment; data: any }>>([]);

  const [showCacheDetailModal, setShowCacheDetailModal] = useState(false);
  const [cacheDetailIndex, setCacheDetailIndex] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/v1/methods')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) setMethods(json.data);
        else setMethods([]);
      })
      .catch(err => alert(strings.home.methods_load_error + err));
  }, []);

  useEffect(() => {
    if (!selectedMethod) return;
    const dynamic: Record<string, any> = {};
    Object.entries(selectedMethod.parameters).forEach(([key, meta]) => {
      dynamic[key] = meta.default != null ? meta.default : (meta.nullable ? null : '');
    });
    setAlgorithmParams(dynamic);
  }, [selectedMethod]);

  useEffect(() => {
    const saved = localStorage.getItem('savedExperiments');
    if (saved) {
      try {
        const arr: Experiment[] = JSON.parse(saved);
        setExperiments(arr);
      } catch {}
      localStorage.removeItem('savedExperiments');
    }
  }, []);

  const handleProblemChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProblem(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value)
    }));
  };

  const handleSeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSeed(Number(e.target.value));
  };

  const handleAlgorithmSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const m = methods.find(x => x.id === id) || null;
    setSelectedMethod(m);
  };

  const handleParamChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAlgorithmParams(prev => ({
      ...prev,
      [name]: value === '' ? null : isNaN(Number(value)) ? value : Number(value)
    }));
  };

  const handleAddExperiment = () => {
    if (!selectedMethod) return;
    const exp: Experiment = {
      id: Date.now().toString(),
      dimension: problem.dimension,
      instance_id: problem.instance_id,
      algorithm: selectedMethod.id,
      seed,
      params: { ...algorithmParams },
      algorithmName: selectedMethod.name
    };
    setExperiments(prev => [...prev, exp]);
  };

  const handleRemoveExperiment = (id: string) => {
    setExperiments(prev => prev.filter(exp => exp.id !== id));
  };

  const handleEditExperimentParam = (expId: string, name: string, value: string) => {
    setExperiments(prev =>
      prev.map(exp =>
        exp.id === expId
          ? {
              ...exp,
              params: {
                ...exp.params,
                [name]: value === '' ? null : isNaN(Number(value)) ? value : Number(value)
              }
            }
          : exp
      )
    );
  };
  

  const handleSubmitAll = async () => {
    if (experiments.length === 0) return;
    setLoading(true);
    try {
      const responses = await Promise.all(
        experiments.map(exp =>
          submitOptimization({
            dimension: exp.dimension,
            instance_id: exp.instance_id,
            algorithm: exp.algorithm,
            seed: exp.seed,
            ...exp.params
          }).then(data => ({ experiment: exp, data }))
        )
      );
      if (responses.length === 1 && !responses[0].data.cached) {
        navigate('/submit-result', { state: { result: { container_name: responses[0].data.container_name } } });
      } else {
        setMultiResults(responses);
        setShowMultiModal(true);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRun = async (exp: Experiment, idx: number) => {
    setLoading(true);
    try {
      const forced = await submitOptimization({
        dimension: exp.dimension,
        instance_id: exp.instance_id,
        algorithm: exp.algorithm,
        seed: exp.seed,
        force_run: true,
        ...exp.params
      });
      const updated = [...multiResults];
      updated[idx] = { experiment: exp, data: forced };
      setMultiResults(updated);
      setShowCacheDetailModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = (container: string) => {
    navigate('/submit-result', { state: { result: { container_name: container } } });
  };

  const handleDownloadCsv = (container: string) => {
    window.open(`/api/v1/optimization/results/${container}/download`, '_blank');
  };

  const openCacheDetail = (idx: number) => {
    setCacheDetailIndex(idx);
    setShowCacheDetailModal(true);
  };

  const fresh = multiResults.filter(r => !r.data.cached);
  const cached = multiResults.filter(r => r.data.cached);

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{strings.home.title}</h1>

      <div>
        <h2>{strings.home.problem_section}</h2>
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
        <h2>{strings.home.algorithm_section}</h2>
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">{strings.home.algorithm}</label>
            <select
              className="form-select"
              value={selectedMethod?.id || ''}
              onChange={handleAlgorithmSelect}
            >
              <option value="">{strings.home.select_algorithm}</option>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{strings.home.seed}</label>
            <input
              className="form-control"
              type="number"
              value={seed}
              onChange={handleSeedChange}
            />
          </div>
          {selectedMethod && Object.entries(selectedMethod.parameters).map(([name, meta]) => (
            <div key={name} className="col-md-4">
              <label className="form-label">{name}</label>
              <input
                className="form-control"
                name={name}
                type={meta.type === 'string' ? 'text' : 'number'}
                step={meta.type === 'float' ? '0.01' : undefined}
                value={algorithmParams[name] == null ? '' : algorithmParams[name]}
                placeholder={meta.nullable ? strings.home.none : ''}
                onChange={handleParamChange}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button className="btn btn-secondary" onClick={handleAddExperiment}>
            {strings.home.add_experiment}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h2>{strings.home.experiments_section}</h2>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>{strings.home.experiment_id}</th>
              <th>{strings.home.dimension}</th>
              <th>{strings.home.instance_id}</th>
              <th>{strings.home.algorithm}</th>
              <th>{strings.home.seed}</th>
              <th>{strings.home.parameters}</th>
              <th>{strings.home.actions}</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map(exp => (
              <tr key={exp.id}>
                <td>{exp.id}</td>
                <td>{exp.dimension}</td>
                <td>{exp.instance_id}</td>
                <td>{exp.algorithmName}</td>
                <td>{exp.seed}</td>
                <td>
                  {Object.entries(exp.params).map(([k, v]) => (
                    <div key={k} className="mb-2">
                      <label className="form-label">{k}</label>
                      <input
                        className="form-control form-control-sm"
                        type={typeof v === 'number' ? 'number' : 'text'}
                        name={k}
                        value={v == null ? '' : v}
                        onChange={e => handleEditExperimentParam(exp.id, k, e.target.value)}
                      />
                    </div>
                  ))}
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveExperiment(exp.id)}
                  >
                    {strings.home.delete_experiment}
                  </button>
                </td>
              </tr>
            ))}
            {experiments.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  {strings.home.no_experiments}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <button
          className="btn btn-primary"
          onClick={handleSubmitAll}
          disabled={loading || experiments.length === 0}
        >
          {loading ? strings.home.submitting : strings.home.submit}
        </button>
      </div>

      {showMultiModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{strings.home.multi_results_title}</h5>
                <button type="button" className="btn-close" onClick={() => setShowMultiModal(false)} />
              </div>
              <div className="modal-body">
                {fresh.length > 0 && (
                  <div>
                    <h6>{strings.home.fresh_section}</h6>
                    {fresh.map((r, i) => (
                      <div key={i} className="border rounded p-2 mb-2">
                        <p><strong>{r.experiment.algorithmName}</strong></p>
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => handleViewLogs(r.data.container_name)}
                        >
                          {strings.home.view_logs}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {cached.length > 0 && (
                  <div className="mt-3">
                    <h6>{strings.home.cached_section}</h6>
                    {cached.map((r, i) => (
                      <div key={i} className="border rounded p-2 mb-2">
                        <p><strong>{r.experiment.algorithmName}</strong> {strings.home.already_cached}</p>
                        <p>{strings.home.best_f}: {r.data.matches[0].best_result['f[1]'].toFixed(6)}</p>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-info btn-sm"
                            onClick={() => openCacheDetail(i)}
                          >
                            {strings.home.view_results}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleForceRun(r.experiment, multiResults.findIndex(m => m.experiment.id === r.experiment.id))}
                          >
                            {strings.home.run_anyway}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowMultiModal(false)}>
                  {strings.home.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCacheDetailModal && cacheDetailIndex !== null && (
        <div className="modal show d-block">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{strings.home.cached_results_title}</h5>
                <button type="button" className="btn-close" onClick={() => setShowCacheDetailModal(false)} />
              </div>
              <div className="modal-body">
                {multiResults[cacheDetailIndex].data.matches.map((res: any) => (
                  <div key={res.result_id} className="border rounded p-2 mb-2">
                    <p><strong>{strings.home.cached_id}</strong> {res.result_id}</p>
                    <p>
                      <strong>{res.algorithm_name} v{res.algorithm_version}</strong><br/>
                      {strings.home.expected_actual}{res.expected_budget} / {res.actual_budget}
                    </p>
                    <h6>{strings.home.best_result}</h6>
                    <ul>
                      {Object.entries(res.best_result).map(([k, v]) =>
                        <li key={k}>{k}: {(v as number).toFixed(6)}</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={() => {
                  handleForceRun(
                    multiResults[cacheDetailIndex].experiment,
                    cacheDetailIndex
                  );
                  setShowCacheDetailModal(false);
                }}>
                  {strings.home.run_anyway}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowCacheDetailModal(false)}>
                  {strings.home.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
