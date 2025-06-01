from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.predict_video.routes import router as predict_video_router
from api.history.routes import router as history_router
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Video Summarization API",
    description="API để tạo video summary sử dụng Deep Summarization Network",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict_video_router, prefix="/api", tags=["video-prediction"])
app.include_router(history_router, prefix="/api", tags=["history"])

@app.get("/")
async def root():
    """Root endpoint với thông tin API"""
    return {
        "message": "Video Summarization API",
        "description": "API để tạo video summary sử dụng Deep Summarization Network",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/predict-video/": "Upload video để tạo summary và trả về video MP4 (H.264+AAC) trực tiếp",
            "GET /api/history/videos": "Lấy danh sách 3 video summary gần nhất (metadata only)",
            "GET /api/history/videos-with-data": "Lấy danh sách video với video data base64 - Format: MP4 (H.264+AAC)",
            "GET /api/history/videos/{video_id}": "Lấy thông tin chi tiết của video",
            "GET /api/history/videos/{video_id}/stream": "Stream video trực tiếp - Format: MP4 (H.264+AAC)",
            "GET /api/history/videos/{video_id}/download": "Download video từ history",
            "DELETE /api/history/videos/{video_id}": "Xóa video khỏi history",
            "GET /api/history/stats": "Thống kê về history",
            "GET /api/health": "Health check",
            "GET /api/status": "API status",
            "GET /": "API information"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Video summarization API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)