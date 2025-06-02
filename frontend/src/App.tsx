// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Search from './components/Search';
import SubmitResult from './components/SubmitResult';
import ResultDetails from './components/ResultDetails';
import Dashboard from './components/Dashboard';
import Files from './components/Files';
import ResultsHistory from './components/ResultsHistory';
import Auth from './components/Auth';
import Exit from './components/Exit';

const App: React.FC = () => {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Header />

        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/submit-result" element={<SubmitResult />} />
            <Route path="/results/:resultID" element={<ResultDetails />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/files" element={<Files />} />
            <Route path="/my" element={<ResultsHistory />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/exit" element={<Exit />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
