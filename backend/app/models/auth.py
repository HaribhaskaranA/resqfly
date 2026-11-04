"""Auth Models & Schemas for RESQFLY Government ID Authentication."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserModel(BaseModel):
    id: str
    full_name: str
    email: str
    department: str
    gov_id: str           # e.g. "GOV-DM-001"
    password_hash: str
    role: str             # "command_center" | "field_rescue"
    is_verified: bool = False
    otp_code: Optional[str] = None
    otp_expires_at: Optional[float] = None  # Unix timestamp
    created_at: str


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    department: str
    gov_id: str
    password: str
    role: str = "command_center"


class OTPVerifyRequest(BaseModel):
    gov_id: str
    otp_code: str


class LoginRequest(BaseModel):
    gov_id: str
    password: str


class AuthResponse(BaseModel):
    token: str
    role: str
    full_name: str
    gov_id: str
    department: str
    message: str = "Login successful"
