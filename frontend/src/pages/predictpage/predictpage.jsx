import React, { useState, useRef, useEffect } from 'react';
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
  const fileInputRef = useRef(null);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (result && result.videoUrl && result.videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(result.videoUrl);
      }
    };
  }, [result]);

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
      // Call API to process video - now returns video blob directly
      const responseData = await videoSummarizationService.predictVideo(selectedFile);
      console.log('Response from backend:', responseData);

      // Tạo blob URL trực tiếp từ video blob
      const blobUrl = URL.createObjectURL(responseData.videoBlob);
      console.log('Blob URL created:', blobUrl);
      
      // Set result với blob URL
      setResult({
        title: "Tóm tắt video: " + selectedFile.name,
        duration: "Auto-generated",
        confidence: "AI Generated",
        videoUrl: blobUrl,
        videoBlob: responseData.videoBlob,
        filename: responseData.filename,
        originalFileName: responseData.originalFileName
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
  };  const handleDownload = () => {
    if (result && result.videoBlob) {
      // Sử dụng blob để download
      const url = URL.createObjectURL(result.videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `summary_${result.originalFileName || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up
    } else if (result && result.videoUrl) {
      // Fallback cho URL thông thường
      const a = document.createElement('a');
      a.href = result.videoUrl;
      a.download = result.filename || `summary_${result.originalFileName || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };  const handleReset = () => {
    // Clean up blob URL if exists
    if (result && result.videoUrl && result.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.videoUrl);
    }
    
    setSelectedFile(null);
    setResult(null);
    setShowModal(false);
    setError(null);
    setIsProcessing(false);
  };  const handleTestVideo = async () => {
    try {
      setError(null);
      console.log('Testing video playback...');
      
      // Fetch list of available videos
      const response = await fetch('http://localhost:8000/api/list-videos');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Available videos:', data);

      if (data.videos && data.videos.length > 0) {
        const firstVideo = data.videos[0];
        
        // Fetch video directly and create blob URL
        const videoResponse = await fetch(`http://localhost:8000/api/videos/${firstVideo.filename}`);
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.status}`);
        }
        
        const videoBlob = await videoResponse.blob();
        const blobUrl = URL.createObjectURL(videoBlob);
        
        // Set result với blob URL
        setResult({
          title: "Test video: " + firstVideo.filename,
          duration: "Auto-generated",
          confidence: "Test",
          videoUrl: blobUrl,
          videoBlob: videoBlob,
          filename: firstVideo.filename,
          originalFileName: "test_video"
        });
        
      } else {
        setError('No test videos available');
      }
    } catch (error) {
      console.error('Error loading test video:', error);
      setError('Error loading test video: ' + error.message);
    }
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
        )}        {/* Upload Section */}
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
                ref={fileInputRef}
              />
              <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                Chọn Video
              </button>
            </div>
            
            {/* Test Button for debugging */}
            <div className="test-section" style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                className="test-btn" 
                onClick={handleTestVideo}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🧪 Test Video Playback
              </button>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Use this to test video playback with existing summary videos
              </p>            </div>
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
                </div>                <div className="video-container">                  <video 
                    controls 
                    className="summary-video"
                    preload="metadata"
                    onError={(e) => {
                      console.error('Video error object:', e.target.error);
                      console.error('Video src:', e.target.src);
                      console.error('Video currentSrc:', e.target.currentSrc);
                      console.error('Video readyState:', e.target.readyState);
                      console.error('Video networkState:', e.target.networkState);
                      
                      const errorCode = e.target.error?.code;
                      let errorMessage = 'Không thể tải video. ';
                      
                      switch(errorCode) {
                        case 1: errorMessage += 'Quá trình tải bị hủy bỏ.'; break;
                        case 2: errorMessage += 'Lỗi mạng khi tải video.'; break;
                        case 3: errorMessage += 'Lỗi giải mã video.'; break;
                        case 4: errorMessage += 'Định dạng video không được hỗ trợ.'; break;
                        default: errorMessage += 'Vui lòng thử lại sau.';
                      }
                      
                      setError(errorMessage + ` (Code: ${errorCode || 'unknown'})`);
                    }}
                    onLoadStart={() => {
                      console.log('Video started loading');
                      console.log('Video src:', result.videoUrl);
                    }}
                    onLoadedMetadata={() => console.log('Video metadata loaded')}
                    onLoadedData={() => console.log('Video data loaded - can play')}
                    onCanPlay={() => console.log('Video can play')}
                    onCanPlayThrough={() => console.log('Video can play through')}
                    onAbort={() => console.log('Video loading aborted')}
                    onStalled={() => console.log('Video loading stalled')}                    onSuspend={() => console.log('Video loading suspended')}
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