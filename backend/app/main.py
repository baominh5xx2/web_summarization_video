from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.predict_video.routes import router as predict_video_router
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

@app.get("/")
async def root():
    """Root endpoint với thông tin API"""
    return {
        "message": "Video Summarization API",
        "description": "API để tạo video summary sử dụng Deep Summarization Network",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/predict-video/": "Upload video để tạo summary",
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