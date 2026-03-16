from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-credentials.json"
    FIREBASE_DATABASE_URL: str = "https://transport-tracking-775fa-default-rtdb.asia-southeast1.firebasedatabase.app"
    APP_ENV: str = "development"
    PORT: int = 8000
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:19006",
        "http://localhost:8081",
        "https://transport-tracking-775fa.web.app",
        "https://transport-tracking-775fa.firebaseapp.com"
    ]

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()