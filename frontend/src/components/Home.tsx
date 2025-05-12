import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitOptimization, OptimizationResult } from '../api';
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

const Home: React.FC = () => {
  const [methods, setMethods] = useState<OptimizationMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<OptimizationMethod | null>(null);
  const [form, setForm] = useState<Record<string, any>>({
    dimension: 2,
    instance_id: 0,
    n_iter: 10,
    algorithm: 1,
    seed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [cachedMatches, setCachedMatches] = useState<OptimizationResult[]>([]);
  const [showModal, setShowModal] = useState(false);

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
    const m = methods.find(x => x.id === form.algorithm);
    if (!m) return;
    setSelectedMethod(m);
  
    const base = {
      dimension: form.dimension,
      instance_id: form.instance_id,
      n_iter: form.n_iter,
      algorithm: form.algorithm,
      seed: form.seed,
    };
  
    const dynamic: Record<string, any> = {};
    Object.entries(m.parameters).forEach(([key, meta]) => {
      dynamic[key] = meta.default != null ? meta.default : (meta.nullable ? null : '');
    });
  
    setForm({ ...base, ...dynamic });
  }, [form.algorithm, methods]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value === '' ? null : isNaN(Number(value)) ? value : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await submitOptimization(form);
      if (data.cached) {
        setCachedMatches(data.matches || []);
        setShowModal(true);
      } else {
        navigate('/submit-result', { state: { result: { container_name: data.container_name } } });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRun = async () => {
    setShowModal(false);
    setLoading(true);
    try {
      const forced = { ...form, force_run: true };
      const data = await submitOptimization(forced);
      navigate('/submit-result', { state: { result: { container_name: data.container_name } } });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToResult = (id: string) => {
    navigate(`/results/${id}`);
  };

  const handleDownloadCsv = (id: string) => {
    window.open(`/api/v1/optimization/results/${id}/download`, '_blank');
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{strings.home.title}</h1>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {}
          {['dimension','instance_id','n_iter','seed'].map(key => (
            <div key={key} className="col-md-3">
              <label className="form-label">{key}</label>
              <input
                className="form-control"
                name={key}
                type="number"
                value={form[key]}
                onChange={handleChange}
              />
            </div>
          ))}

          {}
          <div className="col-md-3">
            <label className="form-label">{strings.home.algorithm}</label>
            <select
              className="form-select"
              name="algorithm"
              value={form.algorithm}
              onChange={handleChange}
            >
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {}
          {selectedMethod && Object.entries(selectedMethod.parameters).map(([name, meta]) => (
            <div key={name} className="col-md-4">
              <label className="form-label">{name}</label>
              <input
                className="form-control"
                name={name}
                type={meta.type === 'string' ? 'text' : 'number'}
                step={meta.type === 'float' ? '0.01' : undefined}
                value={form[name] == null ? '' : form[name]}
                placeholder={meta.nullable ? 'None' : ''}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? strings.home.submitting : strings.home.submit}
          </button>
        </div>
      </form>

      {}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{strings.home.cached_results_title}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                {cachedMatches.map(res => (
                  <div key={res.result_id} className="border rounded p-2 mb-2">
                    <p><strong>{strings.home.cached_id}</strong> {res.result_id}</p>
                    <p>
                      <strong>{res.algorithm_name} v{res.algorithm_version}</strong><br/>
                      {strings.home.expected_actual}{res.expected_budget} / {res.actual_budget}
                    </p>
                    <h6>{strings.home.best_result}</h6>
                    <ul>
                      {Object.entries(res.best_result).map(([k,v]) =>
                        <li key={k}>{k}: {v.toFixed(6)}</li>
                      )}
                    </ul>
                    <div className="d-flex gap-2">
                      <button className="btn btn-info btn-sm"
                              onClick={()=>handleGoToResult(res.result_id)}>
                        {strings.home.view}
                      </button>
                      <button className="btn btn-success btn-sm"
                              onClick={()=>handleDownloadCsv(res.result_id)}>
                        {strings.home.download_csv}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>
                  {strings.home.close}
                </button>
                <button className="btn btn-danger" onClick={handleForceRun}>
                {strings.home.run_anyway}
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
