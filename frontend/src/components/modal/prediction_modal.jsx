import React, { useState, useEffect } from 'react';
import './prediction_modal.css';

function PredictionModal({ isOpen, onClose, fileName, isProcessing }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep('');
      return;
    }

    if (isProcessing) {
      const steps = [
        'Đang tải video lên server...',
        'Đang chuẩn hóa FPS video...',
        'Đang phân tích nội dung video...',
        'Đang tạo tóm tắt với AI...',
        'Đang hoàn thiện video summary...'
      ];

      let stepIndex = 0;
      setCurrentStep(steps[0]);
      setProgress(5);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10 + 3;
          
          const expectedStepIndex = Math.floor(newProgress / 20);
          if (expectedStepIndex < steps.length && expectedStepIndex > stepIndex) {
            stepIndex = expectedStepIndex;
            setCurrentStep(steps[stepIndex]);
          }

          if (newProgress >= 95 || !isProcessing) {
            clearInterval(progressInterval);
            setCurrentStep('Đang hoàn tất...');
            return Math.min(newProgress, 95);
          }
          
          return Math.min(newProgress, 95);
        });
      }, 1000 + Math.random() * 1000);

      return () => clearInterval(progressInterval);
    }
  }, [isOpen, isProcessing]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎬 Đang Tạo Video Tóm Tắt</h2>
          <button className="close-btn" onClick={onClose} disabled={isProcessing}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="generation-phase">
            <div className="generation-animation">
              <div className="video-frame">
                <div className="frame-border">
                  <div className="frame-content">
                    <div className="video-icon">🎥</div>
                    <div className="loading-dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="generation-info">
              <div className="current-step">
                <span className="step-icon">🤖</span>
                <span className="step-text">{currentStep}</span>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{Math.round(progress)}%</div>

              <p className="generation-message">
                🤖 AI đang xử lý video của bạn. Vui lòng đợi trong giây lát...
              </p>
              
              <div className="file-info">
                <p>📁 Đang xử lý: {fileName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PredictionModal;