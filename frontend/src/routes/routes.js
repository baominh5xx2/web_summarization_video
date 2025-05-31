import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Homepage from '../pages/homepage/homepage';
import PredictPage from '../pages/predictpage/predictpage';
import History from '../pages/history/history';
import Interview from '../pages/interview/interview';

const AppRoutes = () => {
  return (    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/upload" element={<PredictPage />} />
      <Route path="/history" element={<History />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/about" element={<Homepage />} />
    </Routes>
  );
};

export default AppRoutes;