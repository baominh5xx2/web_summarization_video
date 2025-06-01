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
        self.TARGET_FPS = 2
        self.MODEL_CHECKPOINT = "api/predict_video/model/checkpoints/dr-dsn-summe.pth.tar"
        self.MODEL_SCRIPT = "api/predict_video/model/summarize_mp4.py"
        
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
            
            # Step 1: Normalize video to target FPS
            normalized_video_path = f"{temp_dir}/normalized_video.mp4"
            await self._normalize_video_fps(input_video_path, normalized_video_path)
            
            # Step 2: Run video summarization
            summary_output_dir = f"{temp_dir}/summary_output"
            await self._run_video_summarization(normalized_video_path, summary_output_dir)
            
            # Step 3: Find and return the summary video path
            summary_video_path = self._find_summary_video(summary_output_dir)
            
            if not summary_video_path or not os.path.exists(summary_video_path):
                raise Exception("Không thể tạo video summary")
            
            logger.info(f"Summary video created: {summary_video_path}")
            return summary_video_path
            
        except Exception as e:
            # Cleanup on error
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
            raise e
    

    
    async def _normalize_video_fps(self, input_path: str, output_path: str):
        """
        Chuẩn hóa video về FPS mục tiêu sử dụng ffmpeg
        
        Args:
            input_path: Đường dẫn video đầu vào
            output_path: Đường dẫn video đầu ra
        """
        try:
            # Get current video info
            info_cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_streams',
                input_path
            ]
            
            result = subprocess.run(info_cmd, capture_output=True, text=True, check=True)
            logger.info(f"Video info retrieved for: {input_path}")
            
            # Try the standard ffmpeg command first
            ffmpeg_cmd = [
                'ffmpeg', '-i', input_path,
                '-filter:v', f'fps={self.TARGET_FPS}',
                '-c:v', 'libx264',  # Use H.264 codec
                '-crf', '23',       # Constant Rate Factor for quality
                '-c:a', 'aac',      # Audio codec
                '-y',               # Overwrite output file
                output_path
            ]
            
            logger.info(f"Normalizing video FPS to {self.TARGET_FPS}")
            
            try:
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=True)
                
                if result.returncode != 0:
                    raise Exception(f"FFmpeg failed: {result.stderr}")
                    
                logger.info(f"Video normalized successfully: {output_path}")
                
            except subprocess.CalledProcessError as e:
                # If the standard command fails, try a simpler fallback
                logger.warning(f"Standard ffmpeg command failed, trying fallback: {e}")
                
                fallback_cmd = [
                    'ffmpeg', '-i', input_path,
                    '-r', str(self.TARGET_FPS),  # Simple frame rate setting
                    '-y',  # Overwrite output file
                    output_path
                ]
                
                logger.info(f"Trying fallback command: {' '.join(fallback_cmd)}")
                result = subprocess.run(fallback_cmd, capture_output=True, text=True, check=True)
                
                if result.returncode != 0:
                    raise Exception(f"FFmpeg fallback failed: {result.stderr}")
                    
                logger.info(f"Video normalized successfully with fallback: {output_path}")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg command failed: {e}")
            raise Exception(f"Lỗi chuẩn hóa video: {e.stderr}")
        except Exception as e:
            logger.error(f"Error normalizing video: {str(e)}")
            raise

    async def _run_video_summarization(self, video_path: str, output_dir: str):
        """
        Chạy model summarization trên video đã được chuẩn hóa
        
        Args:
            video_path: Đường dẫn video đầu vào (đã chuẩn hóa FPS)
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
            
            # Build command to run summarization
            cmd = [
                'python', self.MODEL_SCRIPT,
                '--video', video_path,
                '--ckpt', self.MODEL_CHECKPOINT,
                '--outdir', output_dir,
                '--model-type', 'dr',
                '--fps-out', str(self.TARGET_FPS)
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
            "target_fps": self.TARGET_FPS,
            "supported_formats": ["mp4", "avi", "mov", "mkv"]
        }