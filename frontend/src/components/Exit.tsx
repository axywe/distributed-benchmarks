import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Exit: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('authToken');
    navigate('/');
  }, [navigate]);

  return (
    <div className="container mt-4">
      <h2>Выход</h2>
      <p>Идёт выход из системы...</p>
    </div>
  );
};

export default Exit;
