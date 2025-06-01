from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
import os
import logging
import base64
import tempfile
import asyncio
from api.history.history import HistoryService

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize service
history_service = HistoryService()

async def _transcode_and_stream_video(video_path: str) -> StreamingResponse:
    """
    Transcode video to H.264 + AAC và stream trực tiếp về client
    
    Args:
        video_path: Đường dẫn đến video cần transcode
        
    Returns:
        StreamingResponse: Video stream với MP4 container, H.264 video + AAC audio
    """
    try:
        logger.info(f"Transcoding and streaming video: {video_path}")
        
        # Create temporary file for transcoded output
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
            temp_output_path = temp_file.name
        
        try:
            # FFmpeg command để transcode sang H.264 + AAC
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-c:v', 'libx264',          # H.264 video codec
                '-crf', '23',               # Constant Rate Factor (good quality)
                '-c:a', 'aac',              # AAC audio codec
                '-b:a', '128k',             # Audio bitrate
                '-movflags', '+faststart',  # Web optimization (metadata at beginning)
                '-f', 'mp4',                # Force MP4 format
                '-y',                       # Overwrite output file
                temp_output_path
            ]
            
            # Run FFmpeg
            logger.info(f"Running FFmpeg command with libx264: {' '.join(cmd)}")
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.warning(f"Primary FFmpeg command (libx264) failed: {stderr.decode()}")
                logger.info("Attempting fallback FFmpeg command with libopenh264.")
                
                # Fallback command - use libopenh264
                fallback_cmd = [
                    'ffmpeg',
                    '-i', video_path,
                    '-c:v', 'libopenh264',      # Use libopenh264 encoder
                    '-c:a', 'aac',              # AAC audio codec
                    '-b:a', '128k',             # Audio bitrate
                    '-movflags', '+faststart',  # Web optimization
                    '-f', 'mp4',                # Force MP4 format
                    '-y',                       # Overwrite output file
                    temp_output_path
                ]
                
                logger.info(f"Running fallback FFmpeg command with libopenh264: {' '.join(fallback_cmd)}")
                process = await asyncio.create_subprocess_exec(
                    *fallback_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await process.communicate()
                
                if process.returncode != 0:
                    logger.error(f"Fallback FFmpeg command (libopenh264) also failed: {stderr.decode()}")
                    
                    # Try a more basic fallback - just copy the video without re-encoding
                    logger.info("Attempting basic copy fallback (no re-encoding)")
                    basic_cmd = [
                        'ffmpeg',
                        '-i', video_path,
                        '-c', 'copy',               # Copy streams without re-encoding
                        '-f', 'mp4',                # Force MP4 format
                        '-y',                       # Overwrite output file
                        temp_output_path
                    ]
                    
                    logger.info(f"Running basic copy FFmpeg command: {' '.join(basic_cmd)}")
                    process = await asyncio.create_subprocess_exec(
                        *basic_cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    
                    stdout, stderr = await process.communicate()
                    
                    if process.returncode != 0:
                        logger.error(f"Basic copy FFmpeg command also failed: {stderr.decode()}")
                        raise HTTPException(status_code=500, detail="Video transcoding failed with all available methods.")
                    else:
                        logger.info("Basic copy fallback successful")
            
            logger.info("FFmpeg transcoding successful.")
            # Verify transcoded file was created
            if not os.path.exists(temp_output_path):
                raise HTTPException(status_code=500, detail="Transcoded video file not created")
            
            # Get file size for Content-Length header
            file_size = os.path.getsize(temp_output_path)
            
            def iterfile(file_path: str):
                """Generator function để stream file chunks"""
                try:
                    with open(file_path, 'rb') as file:
                        while True:
                            chunk = file.read(8192)  # Read in 8KB chunks
                            if not chunk:
                                break
                            yield chunk
                finally:
                    # Clean up temp file after streaming
                    try:
                        if os.path.exists(file_path):
                            os.unlink(file_path)
                    except Exception as cleanup_error:
                        logger.warning(f"Error cleaning up files: {cleanup_error}")
            
            logger.info(f"Successfully transcoded video to H.264+AAC, file size: {file_size} bytes")
            
            # Return streaming response with proper headers
            return StreamingResponse(
                iterfile(temp_output_path),
                media_type="video/mp4",
                headers={
                    "Content-Length": str(file_size),
                    "Content-Disposition": "inline; filename=video_summary.mp4",
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
                    "Access-Control-Allow-Headers": "Range, Content-Range, Content-Length",
                    "X-Video-Format": "MP4 (H.264 + AAC)"
                }
            )
            
        except Exception as e:
            # Clean up temp file if error occurs
            try:
                if os.path.exists(temp_output_path):
                    os.unlink(temp_output_path)
            except:
                pass
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcoding and streaming video: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during video processing")

@router.get("/history/videos/latest", response_class=StreamingResponse)
async def get_latest_video():
    """
    Trả về video summary mới nhất dưới dạng binary (MP4 - H.264 + AAC)
    
    Returns:
        StreamingResponse: Video binary MP4 (H.264 + AAC)
    """
    try:
        videos = await history_service.get_recent_videos(1)
        
        if not videos:
            raise HTTPException(status_code=404, detail="Không có video nào trong history")
        
        # Lấy video mới nhất
        latest_video = videos[0]
        filepath = latest_video["filepath"]
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Video file không tồn tại")
        
        # Transcode video to H.264 + AAC format and stream back
        return await _transcode_and_stream_video(filepath)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_latest_video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy video: {str(e)}")

@router.get("/history/videos/{video_index:int}", response_class=StreamingResponse)
async def get_video_by_index(video_index: int):
    """
    Trả về video summary theo thứ tự dưới dạng binary (MP4 - H.264 + AAC)
    
    Args:
        video_index: Index của video (1=mới nhất, 2=thứ 2, etc.)
        
    Returns:
        StreamingResponse: Video binary MP4 (H.264 + AAC)
    """
    try:
        # Validate video_index
        if video_index < 1:
            raise HTTPException(status_code=400, detail="Video index phải >= 1")
        
        # Lấy tất cả video để có thể truy cập theo index
        videos = await history_service.get_recent_videos(50)  # Lấy tối đa 50 video
        
        if not videos:
            raise HTTPException(status_code=404, detail="Không có video nào trong history")
        
        # Kiểm tra index có hợp lệ không
        if video_index > len(videos):
            raise HTTPException(status_code=404, detail=f"Video index {video_index} không tồn tại. Chỉ có {len(videos)} video.")
        
        # Lấy video theo index (index-1 vì array bắt đầu từ 0)
        target_video = videos[video_index - 1]
        filepath = target_video["filepath"]
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Video file không tồn tại")
        
        # Transcode video to H.264 + AAC format and stream back
        return await _transcode_and_stream_video(filepath)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_video_by_index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy video: {str(e)}")

@router.get("/history/list")
async def get_video_list(limit: int = Query(default=10, ge=1, le=50)):
    """
    Lấy danh sách video summary (JSON) để xem có bao nhiêu video
    
    Args:
        limit: Số lượng video tối đa (1-50, mặc định 10)
        
    Returns:
        dict: Danh sách video với metadata
    """
    try:
        videos = await history_service.get_recent_videos(limit)
        return {
            "success": True,
            "count": len(videos),
            "limit": limit,
            "videos": videos
        }
    except Exception as e:
        logger.error(f"Error in get_video_list: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/videos-with-data")
async def get_recent_videos_with_data(limit: int = Query(default=3, ge=1, le=10)):
    """
    Lấy danh sách video summary gần nhất với video data (base64) cho frontend
    Format: MP4 (H.264 + AAC)
    
    Args:
        limit: Số lượng video tối đa (1-10, mặc định 3)
        
    Returns:
        dict: Danh sách video với metadata và data base64
    """
    try:
        videos = await history_service.get_recent_videos(limit)
        videos_with_data = []
        
        for video in videos:
            video_with_data = video.copy()
            
            # Đọc file video và encode base64
            filepath = video["filepath"]
            if os.path.exists(filepath):
                try:
                    with open(filepath, "rb") as f:
                        video_bytes = f.read()
                        video_base64 = base64.b64encode(video_bytes).decode('utf-8')
                        video_with_data["video_data"] = f"data:video/mp4;base64,{video_base64}"
                        video_with_data["size_mb"] = round(len(video_bytes) / (1024 * 1024), 2)
                        video_with_data["format"] = "MP4 (H.264 + AAC)"
                except Exception as file_error:
                    logger.warning(f"Cannot read video file {filepath}: {file_error}")
                    video_with_data["video_data"] = None
                    video_with_data["error"] = "File không thể đọc"
            else:
                video_with_data["video_data"] = None
                video_with_data["error"] = "File không tồn tại"
            
            videos_with_data.append(video_with_data)
        
        return {
            "success": True,
            "count": len(videos_with_data),
            "limit": limit,
            "format": "MP4 (H.264 + AAC)",
            "videos": videos_with_data
        }
    except Exception as e:
        logger.error(f"Error in get_recent_videos_with_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/videos/id/{video_id}/stream")
async def stream_video(video_id: str):
    """
    Stream video trực tiếp cho frontend bằng video ID
    Format: MP4 (H.264 + AAC)
    
    Args:
        video_id: ID của video cần stream
        
    Returns:
        StreamingResponse: Video stream MP4 (H.264 + AAC)
    """
    try:
        video_info = await history_service.get_video_info(video_id)
        filepath = video_info["filepath"]
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Video file không tồn tại")
        
        # Transcode video to H.264 + AAC format and stream back
        return await _transcode_and_stream_video(filepath)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in stream_video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi stream video: {str(e)}")

@router.get("/history/videos/id/{video_id}")
async def get_video_info_by_id(video_id: str):
    """
    Lấy thông tin chi tiết của một video bằng ID
    
    Args:
        video_id: ID của video
        
    Returns:
        dict: Thông tin chi tiết video
    """
    try:
        video_info = await history_service.get_video_info(video_id)
        return {
            "success": True,
            "video": video_info
        }
    except Exception as e:
        logger.error(f"Error in get_video_info_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/videos/id/{video_id}/download")
async def download_video(video_id: str):
    """
    Download video từ history bằng ID
    
    Args:
        video_id: ID của video cần download
        
    Returns:
        FileResponse: Video file
    """
    try:
        video_info = await history_service.get_video_info(video_id)
        filepath = video_info["filepath"]
        filename = video_info["filename"]
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Video file không tồn tại")
        
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in download_video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi download video: {str(e)}")

@router.delete("/history/videos/id/{video_id}")
async def delete_video(video_id: str):
    """
    Xóa video khỏi history
    
    Args:
        video_id: ID của video cần xóa
        
    Returns:
        dict: Kết quả xóa
    """
    try:
        success = await history_service.delete_video(video_id)
        return {
            "success": success,
            "message": f"Video {video_id} đã được xóa thành công"
        }
    except Exception as e:
        logger.error(f"Error in delete_video: {str(e)}")
        raise

@router.get("/history/stats")
async def get_history_stats():
    """
    Lấy thống kê về history
    
    Returns:
        dict: Thông tin thống kê
    """
    try:
        stats = await history_service.get_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error in get_history_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))