"""Configuration management for HBTI FastAPI backend."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration from environment variables."""

    # Tablestore configuration
    OTS_ENDPOINT: str = os.getenv("OTS_ENDPOINT", "https://hbti-prod.cn-hangzhou.ots.aliyuncs.com")
    OTS_INSTANCE: str = os.getenv("OTS_INSTANCE", "hbti-prod")
    OTS_TABLE: str = os.getenv("OTS_TABLE", "hbti_stats")
    OTS_ACCESS_KEY_ID: str = os.getenv("OTS_ACCESS_KEY_ID", "")
    OTS_ACCESS_KEY_SECRET: str = os.getenv("OTS_ACCESS_KEY_SECRET", "")

    # CORS configuration
    ALLOW_ORIGIN: str = os.getenv("ALLOW_ORIGIN", "*")

    # Server configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Valid personality types
    VALID_TYPES: set = {
        "SPCG", "SPCS", "SPCH", "SPSG", "SPSS", "SPHG",
        "SPhS", "GPCG", "GPCS", "GPCH", "GPSG", "GPSS",
        "GPHG", "GPhS", "FPCG", "FPCS"
    }

    # Rarity thresholds
    RARITY_THRESHOLDS = [
        (0.02, "极稀有"),
        (0.05, "很稀有"),
        (0.10, "稀有"),
        (0.20, "较少"),
        (0.35, "常见"),
    ]

    # MySQL database configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://user:password@localhost:3306/hbti?charset=utf8mb4"
    )

    # JWT secret key (generate with: python -c "import secrets; print(secrets.token_hex(32))")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")

    #


config = Config()
