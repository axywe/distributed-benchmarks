import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitOptimization, OptimizationParameters, OptimizationResult } from '../api';

const Home: React.FC = () => {
  const [form, setForm] = useState<OptimizationParameters>({
    dimension: 2,
    instance_id: 0,
    n_iter: 10,
    algorithm: 1,
    seed: 0,
    n_particles: 15,
    inertia_start: 0.9,
    inertia_end: 0.4,
    nostalgia: 2.1,
    societal: 2.1,
    topology: 'gbest',
    tol_thres: null,
    tol_win: 5
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]:
        value === ''
          ? ''
          : isNaN(Number(value))
          ? value
          : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result: OptimizationResult = await submitOptimization(form);
      // Предполагается, что backend возвращает контейнерное имя, используем его как resultID.
      // Если backend возвращает отдельное поле, адаптируйте этот код.
      const resultID = result.algorithm_version; 
      navigate('/submit-result', { state: { result, resultID } });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Optimization Form</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="dimension">Dimension:</label><br />
        <input type="number" id="dimension" name="dimension" value={form.dimension} onChange={handleChange} /><br /><br />

        <label htmlFor="instance_id">Instance ID:</label><br />
        <input type="number" id="instance_id" name="instance_id" value={form.instance_id} onChange={handleChange} /><br /><br />

        <label htmlFor="n_iter">Number of Iterations:</label><br />
        <input type="number" id="n_iter" name="n_iter" value={form.n_iter} onChange={handleChange} /><br /><br />

        <label htmlFor="algorithm">Algorithm:</label><br />
        <select id="algorithm" name="algorithm" value={form.algorithm} onChange={handleChange}>
          <option value="1">Algorithm 1</option>
          <option value="2">Algorithm 2</option>
        </select><br /><br />

        <label htmlFor="seed">Seed:</label><br />
        <input type="number" id="seed" name="seed" value={form.seed} onChange={handleChange} /><br /><br />

        <label htmlFor="n_particles">Number of Particles:</label><br />
        <input type="number" id="n_particles" name="n_particles" value={form.n_particles} onChange={handleChange} /><br /><br />

        <label htmlFor="inertia_start">Inertia Start:</label><br />
        <input type="number" step="0.1" id="inertia_start" name="inertia_start" value={form.inertia_start} onChange={handleChange} /><br /><br />

        <label htmlFor="inertia_end">Inertia End:</label><br />
        <input type="number" step="0.1" id="inertia_end" name="inertia_end" value={form.inertia_end} onChange={handleChange} /><br /><br />

        <label htmlFor="nostalgia">Nostalgia:</label><br />
        <input type="number" step="0.1" id="nostalgia" name="nostalgia" value={form.nostalgia} onChange={handleChange} /><br /><br />

        <label htmlFor="societal">Societal:</label><br />
        <input type="number" step="0.1" id="societal" name="societal" value={form.societal} onChange={handleChange} /><br /><br />

        <label htmlFor="topology">Topology:</label><br />
        <input type="text" id="topology" name="topology" value={form.topology} onChange={handleChange} /><br /><br />

        <label htmlFor="tol_thres">Tolerance Threshold:</label><br />
        <input type="number" step="0.1" id="tol_thres" name="tol_thres" value={form.tol_thres === null ? '' : form.tol_thres} onChange={handleChange} placeholder="None" /><br /><br />

        <label htmlFor="tol_win">Tolerance Window:</label><br />
        <input type="number" id="tol_win" name="tol_win" value={form.tol_win} onChange={handleChange} /><br /><br />

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default Home;
