import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import SubmitResult from './components/SubmitResult';
import ResultDetails from './components/ResultDetails';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit-result" element={<SubmitResult />} />
        <Route path="/results/:resultID" element={<ResultDetails />} />
      </Routes>
    </Router>
  );
};

export default App;
