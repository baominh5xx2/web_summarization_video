import React from 'react';
import './homepage.css';

function Homepage() {
  return (
    <div className="homepage">
      <div className="homepage-container">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              🤖 AI Video Summary
              <span className="hero-subtitle">Tóm tắt video thông minh bằng AI</span>
            </h1>
            <p className="hero-description">
              Tải lên video của bạn và nhận được bản tóm tắt chi tiết, chính xác trong vài giây. 
              Tiết kiệm thời gian và nắm bắt nội dung nhanh chóng.
            </p>
          </div>
        </div>        {/* Upload Section */}
        <div className="upload-section">
          <div className="intro-section">
            <h2>Cách thức hoạt động</h2>
            <div className="steps-container">
              <div className="step-item">
                <div className="step-icon">📤</div>
                <h3>Tải lên video</h3>
                <p>Chọn video từ máy tính hoặc kéo thả vào trang</p>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-item">
                <div className="step-icon">🤖</div>
                <h3>AI xử lý</h3>
                <p>Trí tuệ nhân tạo phân tích và hiểu nội dung video</p>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-item">
                <div className="step-icon">📝</div>
                <h3>Nhận tóm tắt</h3>
                <p>Bản tóm tắt chi tiết, chính xác trong vài giây</p>
              </div>
            </div>          </div>
        </div>
      </div>
    </div>
  );
}

export default Homepage;