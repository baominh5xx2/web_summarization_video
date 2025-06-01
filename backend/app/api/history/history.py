from fastapi import HTTPException
import os
import json
from pathlib import Path
from datetime import datetime
import logging

# Setup logging
logger = logging.getLogger(__name__)

class HistoryService:
    """Service class để quản lý lịch sử video summaries"""
    
    def __init__(self):
        self.HISTORY_DIR = "api/predict_video/model/summary_out"
        
        # Tạo thư mục history nếu chưa tồn tại
        os.makedirs(self.HISTORY_DIR, exist_ok=True)
    
    async def get_recent_videos(self, limit: int = 3) -> list:
        """
        Lấy danh sách video summary gần nhất
        
        Args:
            limit: Số lượng video tối đa trả về (mặc định 3)
            
        Returns:
            list: Danh sách thông tin video
        """
        try:
            video_files = []
            
            # Kiểm tra thư mục history tồn tại
            if not os.path.exists(self.HISTORY_DIR):
                logger.warning(f"History directory does not exist: {self.HISTORY_DIR}")
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
                        except Exception as e:
                            logger.warning(f"Could not parse timestamp from filename {filename}: {e}")
                            created_time = datetime.fromtimestamp(mtime)
                        
                        video_info = {
                            "id": filename.replace('.mp4', ''),
                            "filename": filename,
                            "filepath": filepath,
                            "created_at": created_time.isoformat(),
                            "size_bytes": file_size,
                            "size_mb": round(file_size / (1024 * 1024), 2),
                            "duration_estimate": "Unknown"  # Có thể thêm ffprobe để get duration
                        }
                        video_files.append(video_info)
            
            # Sort theo thời gian tạo, mới nhất trước
            video_files.sort(key=lambda x: x["created_at"], reverse=True)
            
            # Trả về số lượng video theo limit
            result = video_files[:limit]
            
            logger.info(f"Retrieved {len(result)} recent videos from history")
            return result
            
        except Exception as e:
            logger.error(f"Error getting recent videos: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy lịch sử video: {str(e)}")
    
    async def get_video_info(self, video_id: str) -> dict:
        """
        Lấy thông tin chi tiết của một video
        
        Args:
            video_id: ID của video (filename không có .mp4)
            
        Returns:
            dict: Thông tin chi tiết video
        """
        try:
            filename = f"{video_id}.mp4"
            filepath = os.path.join(self.HISTORY_DIR, filename)
            
            if not os.path.exists(filepath):
                raise HTTPException(status_code=404, detail="Video không tồn tại")
            
            # Lấy thông tin file
            file_stats = os.stat(filepath)
            mtime = file_stats.st_mtime
            file_size = file_stats.st_size
            
            # Parse timestamp từ filename
            try:
                # Format: summary_YYYYMMDD_HHMMSS_uniqueid
                parts = video_id.split('_')
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
                "id": video_id,
                "filename": filename,
                "filepath": filepath,
                "created_at": created_time.isoformat(),
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "last_modified": datetime.fromtimestamp(mtime).isoformat()
            }
            
            logger.info(f"Retrieved video info for: {video_id}")
            return video_info
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting video info for {video_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin video: {str(e)}")
    
    async def delete_video(self, video_id: str) -> bool:
        """
        Xóa video khỏi history
        
        Args:
            video_id: ID của video cần xóa
            
        Returns:
            bool: True nếu xóa thành công
        """
        try:
            filename = f"{video_id}.mp4"
            filepath = os.path.join(self.HISTORY_DIR, filename)
            
            if not os.path.exists(filepath):
                raise HTTPException(status_code=404, detail="Video không tồn tại")
            
            os.remove(filepath)
            logger.info(f"Deleted video: {video_id}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting video {video_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Lỗi xóa video: {str(e)}")
    
    async def get_stats(self) -> dict:
        """
        Lấy thống kê về history
        
        Returns:
            dict: Thông tin thống kê
        """
        try:
            if not os.path.exists(self.HISTORY_DIR):
                return {
                    "total_videos": 0,
                    "total_size_mb": 0,
                    "history_dir": self.HISTORY_DIR,
                    "dir_exists": False
                }
            
            video_count = 0
            total_size = 0
            
            for filename in os.listdir(self.HISTORY_DIR):
                if filename.endswith('.mp4') and filename.startswith('summary_'):
                    filepath = os.path.join(self.HISTORY_DIR, filename)
                    if os.path.exists(filepath):
                        video_count += 1
                        total_size += os.path.getsize(filepath)
            
            return {
                "total_videos": video_count,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "history_dir": self.HISTORY_DIR,
                "dir_exists": True
            }
            
        except Exception as e:
            logger.error(f"Error getting history stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")