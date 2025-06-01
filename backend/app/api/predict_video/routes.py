from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from .predict_video import VideoSummarizationService
import logging
import os
import tempfile
import asyncio
import subprocess

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize service
video_service = VideoSummarizationService()

@router.post("/predict-video/", response_class=StreamingResponse)
async def predict_video(request: Request):
    """
    API endpoint để tạo video summary từ video đầu vào và trả về video MP4 (H.264 + AAC) trực tiếp
    
    Args:
        request: HTTP request với video data
        
    Returns:
        StreamingResponse: Video summary MP4 với H.264 + AAC encoding
    """
    try:
        # Get content type from headers
        content_type = request.headers.get("content-type", "")
        
        # Basic validation - check if it's likely a video
        if not any(video_type in content_type.lower() for video_type in ["video", "mp4", "avi", "mov", "mkv"]):
            # If no content-type header, we'll assume it's a video and let the processing handle validation
            logger.warning(f"Unknown content type: {content_type}, proceeding anyway")
        
        logger.info(f"Received video upload request with content-type: {content_type}")
        
        # Read the raw video data
        video_data = await request.body()
        
        if not video_data:
            raise HTTPException(status_code=400, detail="No video data received")
        
        # Process video using service and get the summary video path
        summary_video_path = await video_service.process_video_data(video_data)
        
        if not summary_video_path or not os.path.exists(summary_video_path):
            raise HTTPException(status_code=500, detail="Failed to create video summary")
        
        # Transcode to H.264 + AAC and stream back
        return await _transcode_and_stream_video(summary_video_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý video: {str(e)}")

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
            # FFmpeg command để transcode sang H.264 + AAC (simplified for compatibility)
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
                        # Also clean up original summary file
                        if os.path.exists(video_path):
                            os.unlink(video_path)
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
                    "Cache-Control": "no-cache",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Range, Content-Range, Content-Length"
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

@router.get("/status")
async def api_status():
    """API status endpoint"""
    return await video_service.get_status()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "video-prediction"}