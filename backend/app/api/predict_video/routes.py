from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse
from .predict_video import VideoSummarizationService
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize service
video_service = VideoSummarizationService()

@router.post("/predict-video/")
async def predict_video(request: Request):
    """
    API endpoint để tạo video summary từ video đầu vào
    
    Args:
        request: HTTP request với video data
        
    Returns:
        FileResponse: Video summary đã được tạo
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
        
        # Process video using service
        summary_video_path = await video_service.process_video_data(video_data)
        
        # Return the summary video
        return FileResponse(
            path=summary_video_path,
            media_type='video/mp4',
            filename="summary_video.mp4",
            headers={
                "Content-Disposition": "inline; filename=summary_video.mp4",
                "Accept-Ranges": "bytes"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý video: {str(e)}")

@router.get("/status")
async def api_status():
    """API status endpoint"""
    return await video_service.get_status()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "video-prediction"}

@router.get("/test-video")
async def test_video():
    """Test endpoint to return a sample video"""
    import os
    
    # Try to find a test video file
    test_video_paths = [
        "/mnt/f/UIT/CS106/demoweb/backend/app/api/predict_video/model/summary_out",
        "/mnt/f/UIT/CS106/demoweb/backend/app/api/predict_video/model/video"
    ]
    
    for path in test_video_paths:
        if os.path.exists(path):
            for file in os.listdir(path):
                if file.endswith(('.mp4', '.avi', '.mov')):
                    return FileResponse(
                        path=os.path.join(path, file),
                        media_type='video/mp4',
                        headers={
                            "Content-Disposition": "inline; filename=test_video.mp4",
                            "Accept-Ranges": "bytes"
                        }
                    )
    
    raise HTTPException(status_code=404, detail="No test video found")