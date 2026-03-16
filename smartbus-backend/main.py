from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import location, buses, routes
from app.config import settings
from app.services.firebase_service import initialize_firebase

# Initialize Firebase when app starts
initialize_firebase()

app = FastAPI(
    title="SmartBusTracker API",
    description="Real-time public transport tracking API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(location.router, prefix="/api", tags=["location"])
app.include_router(buses.router, prefix="/api", tags=["buses"])
app.include_router(routes.router, prefix="/api", tags=["routes"])

@app.get("/")
async def root():
    return {"message": "SmartBusTracker API Running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}