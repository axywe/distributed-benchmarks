import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: вместо этого реальный запрос на бэк
    if (token.trim()) {
      localStorage.setItem('authToken', token.trim());
      navigate('/dashboard');
    }
  };

  return (
    <div className="container mt-4">
      <h2>Авторизация</h2>
      <form onSubmit={handleSubmit} className="w-50">
        <div className="mb-3">
          <label className="form-label">Bearer-токен</label>
          <input
            type="text"
            className="form-control"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Введите токен"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={!token.trim()}>
          Войти
        </button>
      </form>
    </div>
  );
};

export default Login;
