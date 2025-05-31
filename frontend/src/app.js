import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/siderbar/siderbar';
import AppRoutes from './routes/routes';
import './app.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="App">
          <Sidebar />
          <div className="main-content">
            <AppRoutes />
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;