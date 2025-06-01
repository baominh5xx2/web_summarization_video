// History Service
// Service để gọi API lấy lịch sử video đã xử lý

const API_BASE_URL = 'http://localhost:8000/api';

class HistoryService {
    /**
     * Lấy danh sách video từ lịch sử
     * @param {number} limit - Số lượng video tối đa
     * @returns {Promise<Object>} - Danh sách video history
     */
    async getVideoHistory(limit = 50) {
        try {
            const response = await fetch(`${API_BASE_URL}/history/list?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('History API response:', data);

            // Transform API data to component format
            const transformedVideos = data.videos.map(video => ({
                id: video.id,
                fileName: video.filename,
                uploadDate: video.created_at,
                duration: video.duration_estimate || 'Unknown',
                fileSize: this.formatFileSize(video.size_bytes),
                confidence: 'AI Generated',
                videoUrl: this.createVideoUrl(video.filepath),
                originalData: video // Keep original data for reference
            }));

            return {
                success: data.success,
                count: data.count,
                videos: transformedVideos
            };

        } catch (error) {
            console.error('Error fetching video history:', error);
            throw error;
        }
    }    /**
     * Tạo URL để access video file
     * @param {string} filepath - Filepath từ API response
     * @returns {string} - Full URL to video
     */
    createVideoUrl(filepath) {
        // API trả về: "api/predict_video/model/summary_out/filename.mp4"
        // Chuyển thành: "demoweb/backend/app/api/predict_video/model/summary_out/filename.mp4"
        
        // Remove leading slash if present
        const cleanPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;
        
        // Create local file path - trỏ trực tiếp đến file trong backend folder
        return `../backend/app/${cleanPath}`;
    }

    /**
     * Format file size từ bytes sang readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format date cho display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                return 'Hôm qua';
            } else if (diffDays < 7) {
                return `${diffDays} ngày trước`;
            } else {
                return date.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    /**
     * Xóa video từ lịch sử (nếu backend hỗ trợ)
     * @param {string} videoId - ID của video cần xóa
     * @returns {Promise<Object>} - Kết quả xóa
     */
    async deleteVideo(videoId) {
        try {
            const response = await fetch(`${API_BASE_URL}/history/delete/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error deleting video:', error);
            throw error;
        }
    }

    /**
     * Download video file
     * @param {string} videoUrl - URL của video
     * @param {string} filename - Tên file để download
     */
    async downloadVideo(videoUrl, filename) {
        try {
            const response = await fetch(videoUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading video:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra trạng thái service
     * @returns {Promise<Object>} - Status information
     */
    async getStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting status:', error);
            throw error;
        }
    }    /**
     * Lấy 3 video mới nhất từ API binary endpoints (giống như predict page)
     * @returns {Promise<Object>} - Danh sách video với blob URLs
     */    async getLatestVideosFromSummaryOut() {
        const videos = [];
        
        console.log('🚀 Starting to fetch 3 videos from binary APIs...');
        
        // Gọi 3 API binary riêng biệt để lấy video
        for (let i = 1; i <= 3; i++) {
            try {
                // Thêm cache busting timestamp để đảm bảo mỗi request là unique
                const timestamp = Date.now();
                const apiUrl = `${API_BASE_URL}/history/videos/${i}?t=${timestamp}`;
                console.log(`📡 Fetching video ${i} from: ${apiUrl}`);
                
                // Fetch video như binary blob (giống predict page)
                const videoResponse = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'video/mp4',
                        'Cache-Control': 'no-cache'
                    }
                });                if (!videoResponse.ok) {
                    console.log(`❌ Failed to fetch video ${i}: ${videoResponse.status}`);
                    continue;
                }
                
                const videoBlob = await videoResponse.blob();
                console.log(`✅ Video ${i} blob loaded:`, videoBlob.size, 'bytes', `Type: ${videoBlob.type}`);
                
                // Debug: log blob details để kiểm tra
                console.log(`🔍 Video ${i} blob details:`, {
                    size: videoBlob.size,
                    type: videoBlob.type,
                    lastModified: videoBlob.lastModified || 'N/A'
                });
                
                // Chỉ thêm video nếu blob có kích thước > 1KB (tránh video rỗng)
                if (videoBlob.size > 1024) {
                    // Tạo blob URL giống predict page với unique identifier
                    const blobUrl = URL.createObjectURL(videoBlob);
                    const uniqueId = `summary_${i}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    const video = {
                        id: uniqueId,
                        fileName: `summary_video_${i}.mp4`,
                        uploadDate: new Date().toISOString(),
                        duration: 'Unknown',
                        fileSize: this.formatFileSize(videoBlob.size),
                        confidence: 'AI Summary',
                        videoUrl: blobUrl, // Blob URL như predict page
                        videoBlob: videoBlob, // Lưu blob để cleanup sau
                        originalData: { 
                            index: i,
                            blobSize: videoBlob.size,
                            blobType: videoBlob.type,
                            fetchTime: new Date().toISOString()
                        }
                    };
                    
                    console.log(`🎬 Created video object ${i}:`, {
                        id: video.id,
                        fileName: video.fileName,
                        size: video.fileSize,
                        blobUrl: video.videoUrl.substring(0, 50) + '...'
                    });
                    videos.push(video);
                } else {
                    console.log(`🚫 Video ${i} skipped: too small (${videoBlob.size} bytes)`);
                }                
            } catch (error) {
                console.log(`🔄 Video ${i} not available:`, error.message);
            }
            
            // Thêm delay nhỏ giữa các request để tránh race condition
            if (i < 3) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`🏁 Final videos array:`, videos);
        console.log(`📊 Total videos found: ${videos.length}`);

        return {
            success: true,
            count: videos.length,
            videos: videos
        };
    }
}

// Create singleton instance
const historyService = new HistoryService();

export default historyService;
export { HistoryService };