import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import strings from '../i18n';

type Mode = 'login' | 'register';

interface ErrorResponse {
  success: boolean;
  data: any;
  meta: {
    message?: string;
    [key: string]: any;
  };
}

const Auth: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [group] = useState('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function parseError(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text) as ErrorResponse;
        return json.meta?.message || JSON.stringify(json);
      } catch {
        return text;
      }
    }
    return text || res.statusText;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }
      const { token } = (await res.json()) as { token: string };
      localStorage.setItem('authToken', token);
      navigate('/my');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, group }),
      });
      if (!res.ok) {
        const msg = await parseError(res);
        throw new Error(msg);
      }
      const body = await res.json() as {
        success: boolean;
        data: { token: string };
      };
      localStorage.setItem('authToken', body.data.token);
      navigate('/my');
    } catch (err: any) {
      setError(err.message || strings.auth.register_failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>{mode === 'login' ? strings.auth.login : strings.auth.register}</h2>

      <div className="btn-group mb-3">
        <button
          type="button"
          className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('login')}
        >
          {strings.auth.login}
        </button>
        <button
          type="button"
          className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('register')}
        >
          {strings.auth.register}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="w-50">
        <div className="mb-3">
          <label className="form-label">{strings.auth.login}</label>
          <input
            type="text"
            className="form-control"
            value={login}
            onChange={e => setLogin(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">{strings.auth.password_label}</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-success"
          disabled={
            loading ||
            !login.trim() ||
            !password.trim() ||
            (mode === 'register' && !group.trim())
          }
        >
          {loading
            ? mode === 'login'
              ? strings.auth.login_submitting
              : strings.auth.register_submitting
            : mode === 'login'
            ? strings.auth.login_submit
            : strings.auth.register}
        </button>
      </form>
    </div>
  );
};

export default Auth;
