// Video Prediction Service
// Service để gọi API video summarization

const API_BASE_URL = 'http://localhost:8000/api';

class VideoSummarizationService {
    /**
     * Gửi video file để tạo summary
     * @param {File} videoFile - Video file từ input
     * @returns {Promise<Object>} - Đối tượng chứa thông tin video summary đã được tạo
     */
    async predictVideo(videoFile) {
        try {
            // Validate input
            if (!videoFile) {
                throw new Error('Vui lòng chọn file video');
            }

            // Check file type
            const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
            if (!allowedTypes.includes(videoFile.type)) {
                throw new Error('Định dạng video không được hỗ trợ. Vui lòng chọn file MP4, AVI, MOV hoặc MKV');
            }

            // Check file size (max 100MB)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (videoFile.size > maxSize) {
                throw new Error('File video quá lớn. Vui lòng chọn file nhỏ hơn 100MB');
            }

            // Send request with raw video data
            const response = await fetch(`${API_BASE_URL}/predict-video/`, {
                method: 'POST',
                headers: {
                    'Content-Type': videoFile.type
                },
                body: videoFile // Send raw video data
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            // Parse the JSON response from the server
            const responseData = await response.json();
            console.log('Received JSON response from server:', responseData);

            // The backend now returns a JSON object with video_url and video_filename
            // Example: { video_filename: "summary_xyz.mp4", video_url: "/api/download-video/summary_xyz.mp4" }
            if (!responseData.video_url || !responseData.video_filename) {
                throw new Error('Invalid response from server: missing video_url or video_filename.');
            }
            
            return responseData; // Return the JSON object directly

        } catch (error) {
            console.error('Error predicting video:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra trạng thái của service
     * @returns {Promise<Object>} - Thông tin trạng thái service
     */
    async getStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting service status:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra health của API
     * @returns {Promise<Object>} - Health status
     */
    async getHealth() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting health status:', error);
            throw error;
        }
    }

    /**
     * Tạo URL để download video summary
     * @param {Blob} videoBlob - Video blob từ API response
     * @param {string} filename - Tên file để download
     * @returns {string} - URL để download
     */
    createDownloadUrl(videoBlob, filename = 'video_summary.mp4') {
        const url = URL.createObjectURL(videoBlob);
        return url;
    }

    /**
     * Download video summary
     * @param {Blob} videoBlob - Video blob từ API response
     * @param {string} filename - Tên file để download
     */
    downloadVideo(videoBlob, filename = 'video_summary.mp4') {
        const url = this.createDownloadUrl(videoBlob, filename);
        
        // Create temporary link to trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Format file size for display
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
     * Validate video file
     * @param {File} file - File to validate
     * @returns {Object} - Validation result
     */
    validateVideoFile(file) {
        const result = {
            isValid: true,
            errors: []
        };

        // Check if file exists
        if (!file) {
            result.isValid = false;
            result.errors.push('Vui lòng chọn file video');
            return result;
        }

        // Check file type
        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
        if (!allowedTypes.includes(file.type)) {
            result.isValid = false;
            result.errors.push('Định dạng video không được hỗ trợ. Chỉ hỗ trợ MP4, AVI, MOV, MKV');
        }

        // Check file size (max 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            result.isValid = false;
            result.errors.push(`File quá lớn (${this.formatFileSize(file.size)}). Tối đa 100MB`);
        }

        // Check minimum file size (1KB)
        const minSize = 1024; // 1KB
        if (file.size < minSize) {
            result.isValid = false;
            result.errors.push('File quá nhỏ. Vui lòng chọn file video hợp lệ');
        }

        return result;
    }
}

// Create singleton instance
const videoSummarizationService = new VideoSummarizationService();

export default videoSummarizationService;
export { VideoSummarizationService };