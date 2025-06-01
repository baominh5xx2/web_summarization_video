import React, { useState, useEffect } from 'react';
import './history.css';
import historyService from '../../services/history';

function History() {
  const [historyData, setHistoryData] = useState([]);
  const [summaryVideos, setSummaryVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);
  // Load history data and summary videos
  useEffect(() => {
    loadHistoryData();
    loadSummaryVideos();
    
    // Cleanup blob URLs when component unmounts
    return () => {
      summaryVideos.forEach(video => {
        if (video.videoUrl && video.videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(video.videoUrl);
        }
      });
    };
  }, []);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading history data...');
      const response = await historyService.getVideoHistory();
      
      console.log('History data loaded:', response);
      setHistoryData(response.videos || []);
      
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Không thể tải dữ liệu lịch sử: ' + error.message);    } finally {
      setLoading(false);
    }
  };
  const loadSummaryVideos = async () => {
    try {
      setSummaryLoading(true);
      
      const response = await historyService.getLatestVideosFromSummaryOut();
      
      setSummaryVideos(response.videos || []);
      
    } catch (error) {
      console.error('❌ Error loading summary videos:', error);
      // Không hiển thị error, chỉ để array rỗng
      setSummaryVideos([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Filter and sort functions
  const filteredData = historyData.filter(item => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.uploadDate) - new Date(a.uploadDate);
      case 'oldest':
        return new Date(a.uploadDate) - new Date(b.uploadDate);
      case 'name':
        return a.fileName.localeCompare(b.fileName);
      case 'size':
        // Parse file size string to number for comparison
        const aSizeValue = parseFloat(a.fileSize.replace(/[^\d.]/g, ''));
        const bSizeValue = parseFloat(b.fileSize.replace(/[^\d.]/g, ''));
        return bSizeValue - aSizeValue;
      default:
        return 0;
    }
  });

  const formatDate = (dateString) => {
    return historyService.formatDate(dateString);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa video này khỏi lịch sử?')) {
      try {
        await historyService.deleteVideo(id);
        // Reload data after successful deletion
        await loadHistoryData();
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Không thể xóa video: ' + error.message);
      }
    }
  };

  const handleDownload = async (item) => {
    try {
      await historyService.downloadVideo(item.videoUrl, item.fileName);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Không thể tải video: ' + error.message);
    }
  };  return (
    <div className="history-page">
      <div className="history-container">
        {/* Header */}
        <div className="history-header">
          <h1>📋 Lịch sử xử lý</h1>
          <p>Quản lý và xem lại các video đã được AI xử lý</p>
        </div>

        {/* Summary Videos Section */}
        {!summaryLoading && summaryVideos.length > 0 && (
          <div className="summary-section" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <div className="summary-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>🎬 Video Summary Mới Nhất</h2>
              <p style={{ margin: 0, opacity: 0.9 }}>Có {summaryVideos.length} video được tóm tắt gần đây</p>
            </div>            <div className="summary-videos-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>              {summaryVideos.map((video, index) => (
                <div key={`${video.id}-${index}`} className="summary-video-card" style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: '0 0 320px' }}>
                    <video
                      key={`video-${video.id}-${index}`}
                      controls
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        background: '#000',
                        maxHeight: '180px'
                      }}
                      src={video.videoUrl}
                      onLoadStart={() => {
                        console.log(`🎥 Video ${index + 1} load started:`, video.videoUrl.substring(0, 50) + '...');
                      }}
                      onLoadedData={() => {
                        console.log(`✅ Video ${index + 1} data loaded:`, video.fileName);
                      }}
                      onError={(e) => {
                        console.error(`❌ Video ${index + 1} load error:`, e, 'URL:', video.videoUrl.substring(0, 50) + '...');
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    >
                      Video không thể phát
                    </video>
                    <div style={{
                      display: 'none',
                      textAlign: 'center',
                      padding: '20px',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: '8px',
                      marginTop: '8px',
                      fontSize: '0.9rem'
                    }}>
                      ❌ Video không thể phát
                    </div>
                  </div>
                  <div className="video-info" style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>{video.fileName}</h4>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '4px' }}>📅 {historyService.formatDate(video.uploadDate)}</div>
                      <div style={{ marginBottom: '4px' }}>📁 {video.fileSize}</div>
                      <div style={{ marginBottom: '4px' }}>🤖 {video.confidence}</div>
                      <div style={{ marginBottom: '4px' }}>⏱️ {video.duration}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>        )}
      </div>
    </div>
  );
}

export default History;