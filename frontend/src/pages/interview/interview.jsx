import React, { useState } from 'react';
import './interview.css';

function Interview() {
  const [teamInfo, setTeamInfo] = useState({
    instructor: 'TS. Lương Ngọc Hoàng',
    students: [
      { name: 'Nguyễn Đình Khôi', studentId: '21520001' },
      { name: 'Nguyễn Minh Triết', studentId: '21520002' },
      { name: 'Ngô Minh Trí', studentId: '21520003' },
      { name: 'Nguyễn Minh Bảo', studentId: '21520004' }
    ]
  });
  return (
    <div className="interview-page">
      <div className="interview-container">
        {/* Header */}
        <div className="interview-header">
          <div className="header-content">
            <h1>👥 Giới thiệu nhóm</h1>
            <p>Thông tin chi tiết về giảng viên hướng dẫn và các thành viên trong nhóm</p>
          </div>
        </div>

        {/* Team Info Card */}
        <div className="team-info-card">
          {/* Instructor Section */}
          <div className="instructor-section">
            <div className="section-header">
              <h2>👨‍🏫 Giảng viên hướng dẫn</h2>
            </div>
            <div className="instructor-card">
              <div className="instructor-avatar">
                <span>👨‍🏫</span>
              </div>              <div className="instructor-info">
                <h3>{teamInfo.instructor}</h3>
                <p>Giảng viên hướng dẫn</p>
              </div>
            </div>
          </div>

          {/* Students Section */}
          <div className="students-section">
            <div className="section-header">
              <h2>👨‍🎓 Danh sách sinh viên</h2>
            </div>            <div className="students-row">
              {teamInfo.students.map((student, index) => (
                <div key={index} className="student-card">
                  <div className="student-avatar">
                    <span>👨‍🎓</span>
                  </div>
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <p>{student.studentId}</p>
                  </div>
                  <div className="student-number">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Info Section */}
          <div className="project-section">
            <div className="section-header">
              <h2>🎯 Thông tin dự án</h2>
            </div>
            <div className="project-card">
              <div className="project-icon">
                <span>🤖</span>
              </div>
              <div className="project-details">
                <h3>AI Video Summary Application</h3>
                <p>Ứng dụng tóm tắt video bằng trí tuệ nhân tạo</p>
                <div className="project-tags">
                  <span className="tag">ReactJS</span>
                  <span className="tag">Python</span>
                  <span className="tag">Machine Learning</span>
                  <span className="tag">Video Processing</span>
                </div>
              </div>
            </div>
          </div>        </div>
      </div>
    </div>
  );
}

export default Interview;