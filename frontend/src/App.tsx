import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import SubmitResult from './components/SubmitResult';
import ResultDetails from './components/ResultDetails';
import Dashboard from './components/Dashboard';
import Files from './components/Files';
import Auth from './components/Auth';
import ResultsHistory from './components/ResultsHistory';
import Exit from './components/Exit';

const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit-result" element={<SubmitResult />} />
        <Route path="/results/:resultID" element={<ResultDetails />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/files" element={<Files />} />
        <Route path="/my" element={<ResultsHistory />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/exit" element={<Exit />} />
      </Routes>
    </Router>
  );
};

export default App;
