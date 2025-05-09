// src/components/Dashboard.tsx
import React, { useEffect, useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

type MethodParam = {
  name: string;
  type: 'int' | 'float' | 'string';
  default: string;
  nullable: boolean;
};

interface OptimizationMethod {
  id: number;
  name: string;
  file_path: string;
  parameters: Record<string, { type: string; default: any; nullable?: boolean }>;
}

const Dashboard: React.FC = () => {
  const [methods, setMethods] = useState<OptimizationMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [methodName, setMethodName] = useState('');
  const [params, setParams] = useState<MethodParam[]>([]);
  const [fileInputs, setFileInputs] = useState<(File | null)[]>([]);

  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const apiFetch = async (url: string, opts: RequestInit = {}) => {
    const headers = opts.headers || {};
    if (token) (headers as any).Authorization = `Bearer ${token}`;
    const res = await fetch(url, { ...opts, headers });
    if (res.status === 401) return navigate('/login');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const loadMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetch('/api/v1/methods');
      setMethods(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const deleteMethod = async (id: number) => {
    if (!window.confirm('Удалить метод?')) return;
    try {
      await apiFetch(`/api/v1/methods/${id}`, { method: 'DELETE' });
      loadMethods();
    } catch (e: any) {
      alert('Ошибка удаления: ' + e.message);
    }
  };

  const addParam = () => {
    setParams([...params, { name: '', type: 'string', default: '', nullable: false }]);
  };
  const updateParam = (i: number, field: keyof MethodParam, value: any) => {
    const p = [...params];
    (p[i] as any)[field] = value;
    setParams(p);
  };
  const removeParam = (i: number) => {
    setParams(params.filter((_, idx) => idx !== i));
  };

  const addFileInput = () => {
    setFileInputs([...fileInputs, null]);
  };
  const updateFileInput = (i: number, file: File | null) => {
    const arr = [...fileInputs];
    arr[i] = file;
    setFileInputs(arr);
  };
  const removeFileInput = (i: number) => {
    setFileInputs(fileInputs.filter((_, idx) => idx !== i));
  };

  const createMethod = async () => {
    if (!methodName.trim()) return alert('Введите имя метода');
    try {
      // 1) создать папку
      await apiFetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '', name: methodName }),
      });

      // 2) загрузить файлы по одному
      for (const f of fileInputs) {
        if (!f) continue;
        const form = new FormData();
        form.append('file', f);
        await apiFetch(
          `/api/v1/files/upload?path=${encodeURIComponent(`${methodName}`)}`,
          { method: 'POST', body: form }
        );
      }

      // 3) создать запись в БД
      const paramsObj: Record<string, any> = {};
      for (const p of params) {
        paramsObj[p.name] = {
          type: p.type,
          default: p.default === '' ? null :
                   p.type === 'int' ? parseInt(p.default, 10) :
                   p.type === 'float' ? parseFloat(p.default) :
                   p.default,
          nullable: p.nullable,
        };
      }
      await apiFetch('/api/v1/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: methodName,
          file_path: `${methodName}`,
          parameters: paramsObj,
        }),
      });

      setShowModal(false);
      setMethodName('');
      setParams([]);
      setFileInputs([]);
      loadMethods();
    } catch (e: any) {
      alert('Ошибка создания: ' + e.message);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Управление алгоритмами</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Добавить алгоритм
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Путь</th>
              <th>Параметры</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {methods.map(m => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>{m.name}</td>
                <td>{m.file_path}</td>
                <td>
                  {Object.entries(m.parameters).map(([k, v]) => (
                    <div key={k}>
                      {k} ({v.type}) = {String(v.default)}
                      {v.nullable && ' (nullable)'}
                    </div>
                  ))}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteMethod(m.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {methods.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  Нет методов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Новый алгоритм</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label>Имя метода</label>
                  <input
                    className="form-control"
                    value={methodName}
                    onChange={e => setMethodName(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label>Файлы алгоритма</label>
                  {fileInputs.map((f, i) => (
                    <div key={i} className="d-flex gap-2 align-items-center mb-2">
                      <input
                        type="file"
                        className="form-control"
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          updateFileInput(i, e.target.files?.[0] || null)
                        }
                      />
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeFileInput(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-outline-secondary btn-sm" onClick={addFileInput}>
                    + Добавить файл
                  </button>
                </div>

                <div className="mb-3">
                  <label>Параметры</label>
                  {params.map((p, i) => (
                    <div key={i} className="d-flex gap-2 align-items-center mb-2">
                      <input
                        className="form-control"
                        placeholder="Имя"
                        value={p.name}
                        onChange={e => updateParam(i, 'name', e.target.value)}
                      />
                      <select
                        className="form-select"
                        value={p.type}
                        onChange={e => updateParam(i, 'type', e.target.value)}
                      >
                        <option value="int">int</option>
                        <option value="float">float</option>
                        <option value="string">string</option>
                      </select>
                      <input
                        className="form-control"
                        placeholder="Default"
                        value={p.default}
                        onChange={e => updateParam(i, 'default', e.target.value)}
                      />
                      <label className="form-check-label">
                        <input
                          type="checkbox"
                          className="form-check-input me-1"
                          checked={p.nullable}
                          onChange={e => updateParam(i, 'nullable', e.target.checked)}
                        />
                        nullable
                      </label>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => removeParam(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="btn btn-outline-secondary btn-sm" onClick={addParam}>
                    + Добавить параметр
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={createMethod}
                  disabled={!methodName.trim()}
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
