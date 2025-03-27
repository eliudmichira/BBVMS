import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import Voter from './pages/Voter';
import Home from './pages/Home';

function App() {
  // Get the base URL for GitHub Pages
  const basename = process.env.PUBLIC_URL;

  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/voter" element={<Voter />} />
      </Routes>
    </Router>
  );
}

export default App; 