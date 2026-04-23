"""Pydantic schemas for HBTI API."""

from pydantic import BaseModel, Field, EmailStr
from typing import Dict, Optional


class SubmitRequest(BaseModel):
    type: str = Field(..., min_length=4, max_length=4, description="4-letter personality type code")


class SubmitResponse(BaseModel):
    ok: bool = True
    type: str
    message: str = "Result saved"


class ErrorResponse(BaseModel):
    ok: bool = False
    error: str
    allowed: list = []


class RarityInfo(BaseModel):
    label: str
    percent: float


class StatsResponse(BaseModel):
    ok: bool = True
    total: int
    counts: Dict[str, int]
    ratios: Dict[str, float]
    rarityByType: Dict[str, RarityInfo]


# Auth schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
