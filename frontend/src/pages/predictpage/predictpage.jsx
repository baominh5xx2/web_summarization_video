import React, { useState } from 'react';
import './predictpage.css';

function PredictPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    // Kiểm tra định dạng file
    const validTypes = ['video/mp4'];
    if (!validTypes.includes(file.type)) {
      alert('Vui lòng chọn file video hợp lệ (MP4, AVI, MOV)');
      return;
    }
    
    // Kiểm tra kích thước file (100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('File quá lớn. Vui lòng chọn file nhỏ hơn 100MB');
      return;
    }
    
    setSelectedFile(file);
    setResult(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleProcessVideo = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      setResult({
        title: "Tóm tắt video: " + selectedFile.name,
        summary: "Đây là bản tóm tắt mẫu của video. Nội dung video bao gồm các chủ đề chính như giới thiệu về công nghệ AI, ứng dụng trong thực tế, và các xu hướng phát triển trong tương lai. Video cung cấp cái nhìn tổng quan về lĩnh vực trí tuệ nhân tạo và tác động của nó đến cuộc sống hàng ngày.",
        keyPoints: [
          "Giới thiệu về công nghệ AI và machine learning",
          "Ứng dụng AI trong các lĩnh vực khác nhau",
          "Xu hướng phát triển AI trong tương lai",
          "Tác động của AI đến xã hội và kinh tế"
        ],
        duration: "5:32",
        confidence: "92%"
      });
      setIsProcessing(false);
    }, 3000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="predict-page">
      <div className="predict-container">
        {/* Header */}
        <div className="predict-header">
          <h1>📹 Tóm tắt Video</h1>
          <p>Tải lên video và nhận bản tóm tắt chi tiết từ AI</p>
        </div>

        {/* Upload Section */}
        {!selectedFile && !result && (
          <div className="upload-zone">
            <div 
              className={`upload-area ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="upload-icon">🎬</div>
              <h3>Kéo thả video vào đây</h3>
              <p>hoặc nhấn để chọn file</p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" className="upload-btn">
                Chọn Video
              </label>
              <div className="upload-info">
                <p>Hỗ trợ: MP4, AVI, MOV • Tối đa 100MB</p>
              </div>
            </div>
          </div>
        )}

        {/* File Selected */}
        {selectedFile && !result && (
          <div className="file-selected">
            <div className="file-info">
              <div className="file-icon">📁</div>
              <div className="file-details">
                <h3>{selectedFile.name}</h3>
                <p>Kích thước: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                <p>Loại: {selectedFile.type}</p>
              </div>
            </div>
            <div className="action-buttons">
              <button className="process-btn" onClick={handleProcessVideo} disabled={isProcessing}>
                {isProcessing ? '🤖 Đang xử lý...' : '🚀 Tóm tắt Video'}
              </button>
              <button className="reset-btn" onClick={handleReset}>
                🔄 Chọn lại
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="processing">
            <div className="processing-animation">
              <div className="spinner"></div>
            </div>
            <h3>AI đang phân tích video...</h3>
            <p>Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="result-section">
            <div className="result-header">
              <h2>✨ Kết quả tóm tắt</h2>
              <div className="result-meta">
                <span className="duration">⏱️ {result.duration}</span>
                <span className="confidence">🎯 Độ tin cậy: {result.confidence}</span>
              </div>
            </div>
            
            <div className="result-content">
              <div className="summary-card">
                <h3>📝 Tóm tắt chính</h3>
                <p>{result.summary}</p>
              </div>
              
              <div className="keypoints-card">
                <h3>🎯 Điểm quan trọng</h3>
                <ul>
                  {result.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="result-actions">
              <button className="download-btn">💾 Tải xuống</button>
              <button className="share-btn">📤 Chia sẻ</button>
              <button className="new-btn" onClick={handleReset}>🆕 Video mới</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PredictPage;