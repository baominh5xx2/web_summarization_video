from fastapi import HTTPException
import os
import subprocess
import uuid
import shutil
from pathlib import Path
import logging
import asyncio
from datetime import datetime

# Setup logging
logger = logging.getLogger(__name__)

class VideoSummarizationService:
    """Service class để xử lý video summarization"""
    
    def __init__(self):
        self.MODEL_CHECKPOINT = "api/predict_video/model/checkpoints/dr-dsn-summe.pth.tar"
        self.MODEL_SCRIPT = "api/predict_video/model/summarize_mp4.py"
        self.HISTORY_DIR = "api/predict_video/model/summary_out"  # Thư mục lưu lịch sử video
        
        # Tạo thư mục history nếu chưa tồn tại
        os.makedirs(self.HISTORY_DIR, exist_ok=True)
        
    async def process_video_data(self, video_data: bytes) -> str:
        """
        Xử lý video data và tạo summary
        
        Args:
            video_data: Raw video bytes data
            
        Returns:
            str: Đường dẫn đến video summary tạm thời
        """
        # Generate unique ID for this request
        request_id = str(uuid.uuid4())
        
        # Create temporary directories
        temp_dir = f"/tmp/video_processing_{request_id}"
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            # Save video data to file
            input_video_path = f"{temp_dir}/input_video.mp4"
            with open(input_video_path, "wb") as f:
                f.write(video_data)
            
            logger.info(f"Video data saved: {input_video_path} ({len(video_data)} bytes)")
            
            # Step 1: Run video summarization directly on input video
            summary_output_dir = f"{temp_dir}/summary_output"
            await self._run_video_summarization(input_video_path, summary_output_dir)
            
            # Step 2: Find and return the summary video path
            summary_video_path = self._find_summary_video(summary_output_dir)
            
            if not summary_video_path or not os.path.exists(summary_video_path):
                raise Exception("Không thể tạo video summary")
            
            # Step 3: Save to history
            history_video_path = await self._save_to_history(summary_video_path)
            
            logger.info(f"Summary video created: {summary_video_path}")
            logger.info(f"Summary video saved to history: {history_video_path}")
            return summary_video_path
            
        except Exception as e:
            # Cleanup on error
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
            raise e

    async def _run_video_summarization(self, video_path: str, output_dir: str):
        """
        Chạy model summarization trên video gốc
        
        Args:
            video_path: Đường dẫn video đầu vào
            output_dir: Thư mục đầu ra cho video summary
        """
        try:
            # Create output directory
            os.makedirs(output_dir, exist_ok=True)
            
            # Check if model checkpoint exists
            if not os.path.exists(self.MODEL_CHECKPOINT):
                raise Exception(f"Model checkpoint không tồn tại: {self.MODEL_CHECKPOINT}")
            
            # Check if model script exists
            if not os.path.exists(self.MODEL_SCRIPT):
                raise Exception(f"Model script không tồn tại: {self.MODEL_SCRIPT}")
            
            # Build command to run summarization - let model use original video FPS
            cmd = [
                'python', self.MODEL_SCRIPT,
                '--video', video_path,
                '--ckpt', self.MODEL_CHECKPOINT,
                '--outdir', output_dir,
                '--model-type', 'dr'
                # Không chỉ định fps-out để sử dụng FPS gốc của video
            ]
            
            logger.info(f"Running video summarization: {' '.join(cmd)}")
            
            # Run the summarization command
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                check=True,
                cwd='/mnt/f/UIT/CS106/demoweb/backend/app'  # Set working directory
            )
            
            if result.returncode != 0:
                raise Exception(f"Summarization failed: {result.stderr}")
                
            logger.info("Video summarization completed successfully")
            logger.info(f"Summarization output: {result.stdout}")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Summarization command failed: {e}")
            raise Exception(f"Lỗi chạy model summarization: {e.stderr}")
        except Exception as e:
            logger.error(f"Error running summarization: {str(e)}")
            raise

    def _find_summary_video(self, output_dir: str) -> str:
        """
        Tìm file video summary trong thư mục output
        
        Args:
            output_dir: Thư mục chứa kết quả
            
        Returns:
            str: Đường dẫn đến file video summary
        """
        try:
            # Look for MP4 files in output directory
            output_path = Path(output_dir)
            
            # Common patterns for summary video names
            video_patterns = [
                "*.mp4",
                "summary*.mp4",
                "*summary*.mp4"
            ]
            
            for pattern in video_patterns:
                video_files = list(output_path.glob(pattern))
                if video_files:
                    # Return the first found video file
                    return str(video_files[0])
            
            # If no specific pattern found, return any MP4 file
            all_mp4_files = list(output_path.glob("*.mp4"))
            if all_mp4_files:
                return str(all_mp4_files[0])
                
            raise Exception("Không tìm thấy file video summary")
            
        except Exception as e:
            logger.error(f"Error finding summary video: {str(e)}")
            raise

    async def _save_to_history(self, summary_video_path: str) -> str:
        """
        Lưu video summary vào thư mục history với tên file có timestamp
        
        Args:
            summary_video_path: Đường dẫn video summary tạm thời
            
        Returns:
            str: Đường dẫn video trong history
        """
        try:
            # Tạo tên file với timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]  # 8 ký tự đầu của UUID
            history_filename = f"summary_{timestamp}_{unique_id}.mp4"
            history_video_path = os.path.join(self.HISTORY_DIR, history_filename)
            
            # Copy video từ temp sang history
            shutil.copy2(summary_video_path, history_video_path)
            
            # Cleanup old videos - chỉ giữ lại 10 video gần nhất
            await self._cleanup_old_videos()
            
            logger.info(f"Video saved to history: {history_video_path}")
            return history_video_path
            
        except Exception as e:
            logger.error(f"Error saving video to history: {str(e)}")
            # Không raise error vì việc lưu history không critical
            return ""

    async def _cleanup_old_videos(self):
        """
        Cleanup old videos, chỉ giữ lại 10 video gần nhất
        """
        try:
            # Lấy danh sách tất cả video trong history
            video_files = []
            for filename in os.listdir(self.HISTORY_DIR):
                if filename.endswith('.mp4') and filename.startswith('summary_'):
                    filepath = os.path.join(self.HISTORY_DIR, filename)
                    # Lấy thời gian modify của file
                    mtime = os.path.getmtime(filepath)
                    video_files.append((mtime, filepath))
            
            # Sort theo thời gian, mới nhất trước
            video_files.sort(reverse=True)
            
            # Xóa các file cũ, chỉ giữ lại 10 file
            if len(video_files) > 10:
                for _, filepath in video_files[10:]:
                    try:
                        os.remove(filepath)
                        logger.info(f"Removed old video: {filepath}")
                    except Exception as e:
                        logger.warning(f"Could not remove old video {filepath}: {e}")
                        
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

    async def get_history_videos(self, limit: int = 3) -> list:
        """
        Lấy danh sách video từ history
        
        Args:
            limit: Số lượng video tối đa trả về (mặc định 3)
            
        Returns:
            list: Danh sách thông tin video
        """
        try:
            video_files = []
            
            # Kiểm tra thư mục history tồn tại
            if not os.path.exists(self.HISTORY_DIR):
                return []
            
            # Lấy danh sách tất cả video trong history
            for filename in os.listdir(self.HISTORY_DIR):
                if filename.endswith('.mp4') and filename.startswith('summary_'):
                    filepath = os.path.join(self.HISTORY_DIR, filename)
                    if os.path.exists(filepath):
                        # Lấy thông tin file
                        file_stats = os.stat(filepath)
                        mtime = file_stats.st_mtime
                        file_size = file_stats.st_size
                        
                        # Parse timestamp từ filename
                        try:
                            # Format: summary_YYYYMMDD_HHMMSS_uniqueid.mp4
                            parts = filename.replace('.mp4', '').split('_')
                            if len(parts) >= 3:
                                date_str = parts[1]
                                time_str = parts[2]
                                timestamp_str = f"{date_str}_{time_str}"
                                created_time = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                            else:
                                created_time = datetime.fromtimestamp(mtime)
                        except:
                            created_time = datetime.fromtimestamp(mtime)
                        
                        video_info = {
                            "filename": filename,
                            "filepath": filepath,
                            "created_at": created_time.isoformat(),
                            "size_bytes": file_size,
                            "size_mb": round(file_size / (1024 * 1024), 2)
                        }
                        video_files.append(video_info)
            
            # Sort theo thời gian tạo, mới nhất trước
            video_files.sort(key=lambda x: x["created_at"], reverse=True)
            
            # Trả về số lượng video theo limit
            return video_files[:limit]
            
        except Exception as e:
            logger.error(f"Error getting history videos: {str(e)}")
            return []

    async def get_status(self) -> dict:
        """
        Lấy trạng thái của service
        
        Returns:
            dict: Thông tin trạng thái
        """
        return {
            "status": "online",
            "service": "video-summarization",
            "model_available": os.path.exists(self.MODEL_CHECKPOINT),
            "script_available": os.path.exists(self.MODEL_SCRIPT),
            "supported_formats": ["mp4", "avi", "mov", "mkv"]
        }