import React, { useState } from 'react';
import './predictpage.css';
import PredictionModal from '../../components/modal/prediction_modal';
import videoSummarizationService from '../../services/predictvideo';

function PredictPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

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
    // Validate file using service
    const validation = videoSummarizationService.validateVideoFile(file);
    
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }
    
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };  const handleProcessVideo = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setError(null);
    setShowModal(true);
    
    try {
      // Call API to process video
      const summaryVideoBlob = await videoSummarizationService.predictVideo(selectedFile);
      
      // Create URL for the summary video
      const videoUrl = videoSummarizationService.createDownloadUrl(summaryVideoBlob);
      
      // Set result with video data
      setResult({
        title: "Tóm tắt video: " + selectedFile.name,
        duration: "Auto-generated", // Duration will be calculated by video element
        confidence: "AI Generated",
        videoUrl: videoUrl,
        videoBlob: summaryVideoBlob,
        originalFileName: selectedFile.name
      });
      
    } catch (error) {
      console.error('Error processing video:', error);
      setError(error.message || 'Có lỗi xảy ra khi xử lý video');
    } finally {
      setIsProcessing(false);
      setShowModal(false);
    }
  };  const handleModalComplete = (modalResult) => {
    // This method might not be needed anymore since we handle everything in handleProcessVideo
    if (modalResult && modalResult.videoUrl) {
      setResult({
        title: "Tóm tắt video: " + selectedFile.name,
        duration: "2:45",
        confidence: "95%",
        videoUrl: modalResult.videoUrl
      });
    }
  };

  const handleModalClose = () => {
    if (!isProcessing) {
      setShowModal(false);
    }
  };

  const handleDownload = () => {
    if (result && result.videoBlob) {
      const fileName = `summary_${result.originalFileName || 'video'}.mp4`;
      videoSummarizationService.downloadVideo(result.videoBlob, fileName);
    }
  };  const handleReset = () => {
    // Clean up video URL to prevent memory leaks
    if (result && result.videoUrl) {
      URL.revokeObjectURL(result.videoUrl);
    }
    
    setSelectedFile(null);
    setResult(null);
    setShowModal(false);
    setError(null);
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

        {/* Error Display */}
        {error && (
          <div className="error-section">
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
            <button className="error-close" onClick={() => setError(null)}>✕</button>
          </div>
        )}

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
              <div className="file-icon">📁</div>              <div className="file-details">
                <h3>{selectedFile.name}</h3>
                <p>Kích thước: {videoSummarizationService.formatFileSize(selectedFile.size)}</p>
                <p>Loại: {selectedFile.type}</p>
              </div>
            </div>            <div className="action-buttons">
              <button 
                className="process-btn" 
                onClick={handleProcessVideo}
                disabled={isProcessing}
              >
                {isProcessing ? '⏳ Đang xử lý...' : '🚀 Tóm tắt Video'}
              </button>
              <button 
                className="reset-btn" 
                onClick={handleReset}
                disabled={isProcessing}
              >
                🔄 Chọn lại
              </button>
            </div>
          </div>
        )}        {/* Result */}
        {result && (
          <div className="result-section">
            <div className="result-header">
              <h2>✨ Video tóm tắt đã sẵn sàng!</h2>
              <div className="result-meta">
                <span className="duration">⏱️ {result.duration}</span>
                <span className="confidence">🎯 Độ tin cậy: {result.confidence}</span>
              </div>
            </div>            <div className="result-content">
              {/* Video Preview */}              <div className="video-preview-card">                <div className="video-header">
                  <h3>🎬 Video tóm tắt</h3>
                  <button className="download-btn" onClick={handleDownload}>
                    <span>💾</span>
                  </button>
                </div>
                <div className="video-container">
                  <video 
                    controls 
                    className="summary-video"
                  >
                    <source src={result.videoUrl} type="video/mp4" />
                    Trình duyệt của bạn không hỗ trợ video.
                  </video>
                </div>
              </div>
            </div>              <div className="result-actions">
              <button className="new-btn" onClick={handleReset}>
                <span>🆕</span>
                <span>Video mới</span>
              </button>
            </div>
          </div>
        )}        {/* Prediction Modal */}
        <PredictionModal
          isOpen={showModal}
          onClose={handleModalClose}
          fileName={selectedFile?.name || ''}
          isProcessing={isProcessing}
          onComplete={handleModalComplete}
        />
      </div>
    </div>
  );
}

export default PredictPage;