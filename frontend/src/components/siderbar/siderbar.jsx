import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './siderbar.css';

function Sidebar() {
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();

  const menuItems = [
    { path: '/', label: 'Trang chủ', icon: '🏠' },
    { path: '/upload', label: 'Tải video', icon: '📹' },
    { path: '/history', label: 'Lịch sử', icon: '📋' },
    { path: '/interview', label: 'Giới thiệu', icon: 'ℹ️' }
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h2>🤖 AI Video Summary</h2>
      </div>
      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.path} className="sidebar-item">
            <Link 
              to={item.path} 
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.label}</span>
            </Link>
          </li>        ))}
      </ul>
      
      <div className="theme-toggle">        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          <div className="toggle-track">
            <div className={`toggle-thumb ${isDarkMode ? 'dark' : 'light'}`}>
              <div className="toggle-icon">
                {isDarkMode ? (
                  <div className="sun-icon">
                    <div className="sun-center"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                    <div className="sun-ray"></div>
                  </div>
                ) : (
                  <div className="moon-icon">
                    <div className="moon-center"></div>
                    <div className="star star-1">✦</div>
                    <div className="star star-2">✦</div>
                    <div className="star star-3">✨</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;