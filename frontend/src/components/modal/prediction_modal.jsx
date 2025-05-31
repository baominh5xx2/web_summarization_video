import React, { useState, useEffect } from 'react';
import './prediction_modal.css';

function PredictionModal({ isOpen, onClose, fileName, onComplete }) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      // Reset khi modal đóng
      setIsGenerating(true);
      setProgress(0);
      setVideoUrl(null);
      setIsWaiting(false);
      return;
    }

    // Simulate video generation process
    const generateVideo = async () => {
      // Tăng tiến độ từ 0% đến 80% trong 8 giây
      const progressToEighty = setInterval(() => {
        setProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressToEighty);
            setIsWaiting(true);
            
            // Sau 3-5 giây (simulate video processing), đẩy nhanh từ 80% -> 100%
            setTimeout(() => {
              const finalProgress = setInterval(() => {
                setProgress(prev => {
                  if (prev >= 100) {
                    clearInterval(finalProgress);
                    setTimeout(() => {
                      setIsGenerating(false);
                      setVideoUrl('https://www.w3schools.com/html/mov_bbb.mp4');
                      if (onComplete) {
                        onComplete({
                          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                          summary: 'Video tóm tắt đã được tạo thành công!'
                        });
                      }
                    }, 500);
                    return 100;
                  }
                  return prev + 5; // Tăng nhanh 5% mỗi lần
                });
              }, 200); // Mỗi 200ms
            }, Math.random() * 2000 + 3000); // Random 3-5 giây
            
            return 80;
          }
          return prev + 1; // Tăng 1% mỗi lần
        });
      }, 100); // Mỗi 100ms, sẽ mất 8 giây để đạt 80%
    };

    generateVideo();
  }, [isOpen, onComplete]);

  const handleDownload = () => {
    // Simulate download
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${fileName}_summary.mp4`;
    link.click();
  };
  const handleClose = () => {
    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);
    setIsWaiting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎬 Tạo Video Tóm Tắt</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>        <div className="modal-body">
          {isGenerating ? (
            // Giai đoạn tạo video
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
              </div>              <div className="generation-info">
                <div className={`current-step ${isWaiting ? 'waiting' : ''}`}>
                  <span className="step-icon">🤖</span>
                  <span className="step-text">
                    {isWaiting ? 'Đang hoàn thiện video...' : 'AI đang phân tích và tạo video tóm tắt...'}
                  </span>
                </div>

                <div className={`progress-bar ${isWaiting ? 'waiting' : ''}`}>
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">{Math.round(progress)}%</div>

                <p className="generation-message">
                  {isWaiting ? 
                    '⏳ Đang hoàn thiện video, vui lòng đợi thêm chút...' : 
                    '🤖 AI đang tạo video tóm tắt cho bạn. Vui lòng đợi trong giây lát...'
                  }
                </p>
              </div>
            </div>
          ) : (
            // Giai đoạn hiển thị kết quả
            <div className="result-phase">
              <div className="success-header">
                <div className="success-icon">✅</div>
                <h3>Video tóm tắt đã sẵn sàng!</h3>
                <p>AI đã tạo thành công video tóm tắt từ nội dung gốc</p>
              </div>

              <div className="video-preview">
                <video 
                  controls 
                  className="summary-video"
                  poster="/api/placeholder/600/340"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Trình duyệt của bạn không hỗ trợ video.
                </video>
              </div>

              <div className="video-info">
                <div className="info-row">
                  <span className="info-label">📁 Tên file:</span>
                  <span className="info-value">{fileName}_summary.mp4</span>
                </div>
                <div className="info-row">
                  <span className="info-label">⏱️ Thời lượng:</span>
                  <span className="info-value">2:45</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📏 Kích thước:</span>
                  <span className="info-value">15.2 MB</span>
                </div>
                <div className="info-row">
                  <span className="info-label">🎯 Chất lượng:</span>
                  <span className="info-value">HD 720p</span>
                </div>
              </div>

              <div className="result-actions">
                <button className="download-btn" onClick={handleDownload}>
                  💾
                </button>
                <button className="preview-btn">
                  👁️ Xem trước
                </button>
                <button className="share-btn">
                  📤 Chia sẻ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictionModal;