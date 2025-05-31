import React, { useState, useEffect } from 'react';
import './history.css';

function History() {
  const [historyData, setHistoryData] = useState([]);  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  // Sample history data - In real app, this would come from API/local storage
  useEffect(() => {
    const sampleHistory = [
      {
        id: 1,
        fileName: 'Introduction_to_AI.mp4',
        uploadDate: '2024-01-15T10:30:00Z',
        duration: '8:45',
        fileSize: '156.2 MB',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video URL
        summary: 'Video này giới thiệu về trí tuệ nhân tạo, các ứng dụng trong đời sống và xu hướng phát triển tương lai.',
        keyPoints: [
          'Khái niệm cơ bản về AI',
          'Ứng dụng trong y tế và giáo dục',
          'Machine Learning và Deep Learning',
          'Xu hướng phát triển trong tương lai'
        ],
        confidence: '94%'
      },
      {
        id: 2,
        fileName: 'React_Tutorial_Advanced.mp4',
        uploadDate: '2024-01-14T15:20:00Z',
        duration: '12:30',
        fileSize: '287.5 MB',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', // Sample video URL
        summary: 'Hướng dẫn nâng cao về React, bao gồm hooks, context API, và các pattern phổ biến.',
        keyPoints: [
          'Custom hooks và useEffect',
          'Context API và state management',
          'Performance optimization',
          'Testing với React Testing Library'
        ],
        confidence: '91%'
      },
      {
        id: 3,
        fileName: 'Web_Development_Basics.mp4',
        uploadDate: '2024-01-11T11:30:00Z',
        duration: '25:40',
        fileSize: '523.8 MB',
        videoUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4', // Sample video URL
        summary: 'Khóa học cơ bản về phát triển web, từ HTML/CSS đến JavaScript và các framework hiện đại.',
        keyPoints: [
          'HTML semantics và accessibility',
          'CSS Grid và Flexbox',
          'JavaScript ES6+ features',
          'Introduction to React và Vue'
        ],
        confidence: '89%'
      },
      {
        id: 4,
        fileName: 'Python_Data_Science.mp4',
        uploadDate: '2024-01-10T09:15:00Z',
        duration: '18:22',
        fileSize: '342.8 MB',
        videoUrl: 'https://www.w3schools.com/html/movie.mp4', // Sample video URL
        summary: 'Giới thiệu về Data Science với Python, pandas, numpy và các thư viện machine learning.',
        keyPoints: [
          'Pandas cho data manipulation',
          'Numpy cho numerical computing',
          'Matplotlib và Seaborn cho visualization',
          'Scikit-learn cho machine learning'
        ],
        confidence: '92%'
      }
    ];

    setHistoryData(sampleHistory);
  }, []);
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
        return parseFloat(b.fileSize) - parseFloat(a.fileSize);
      default:
        return 0;
    }
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa video này khỏi lịch sử?')) {
      setHistoryData(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div className="history-page">
      <div className="history-container">
        {/* Header */}
        <div className="history-header">
          <h1>📋 Lịch sử xử lý</h1>
          <p>Quản lý và xem lại các video đã được AI xử lý</p>
        </div>

        {/* Controls */}
        <div className="history-controls">
          <div className="history-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-number">{sortedData.length}</span>
              <span className="stat-label">Tổng video</span>
            </div>
          </div>
        </div>
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm theo tên file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
            <div className="filter-sort-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="name">Tên A-Z</option>
              <option value="size">Kích thước</option>
            </select>
          </div>
               {/* Stats */}
        
        </div>
        {/* History List */}
        <div className="history-list">
          {sortedData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Không tìm thấy kết quả</h3>
              <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (            sortedData.map((item) => (
              <div key={item.id} className="history-item">
                <div className="item-header">
                  <div className="item-info">
                    <h3 className="file-name">{item.fileName}</h3>
                    <div className="item-meta">
                      <span className="upload-date">📅 {formatDate(item.uploadDate)}</span>
                      <span className="duration">⏱️ {item.duration}</span>
                      <span className="file-size">💾 {item.fileSize}</span>
                      <span className="confidence">🎯 {item.confidence}</span>
                    </div>
                  </div>
                  
                  <div className="item-actions">
                    <button className="download-btn" title="Tải xuống">
                      💾
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-btn"
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </div>
                </div>                {/* Video Player */}
                <div className="video-section">
                  <video 
                    controls 
                    className="video-player"
                    poster={`https://via.placeholder.com/640x360/7c3aed/ffffff?text=${encodeURIComponent(item.fileName)}`}
                  >
                    <source src={item.videoUrl} type="video/mp4" />
                    Trình duyệt của bạn không hỗ trợ video player.
                  </video>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default History;