import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import strings from '../i18n';

const Exit: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('authToken');
    navigate('/');
  }, [navigate]);

  return (
    <div className="container mt-4">
      <h2>{strings.exit.title}</h2>
      <p>{strings.exit.message}</p>
    </div>
  );
};

export default Exit;
