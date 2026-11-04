"""Auth API Router — Government ID Registration, OTP Verification, Login."""
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from typing import Optional
from app.models.auth import RegisterRequest, OTPVerifyRequest, LoginRequest
from app.core.auth_engine import register_user, verify_otp, login_user, get_user_from_token, logout_user

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


@auth_router.post("/register")
def api_register(req: RegisterRequest):
    """Register a new user with Government ID. Returns simulated OTP for verification."""
    result = register_user(req)
    status_code = 200 if result.get("success") else 400
    return JSONResponse(content=result, status_code=status_code)


@auth_router.post("/verify-otp")
def api_verify_otp(req: OTPVerifyRequest):
    """Verify the 6-digit OTP to activate account."""
    result = verify_otp(req)
    status_code = 200 if result.get("success") else 400
    return JSONResponse(content=result, status_code=status_code)


@auth_router.post("/login")
def api_login(req: LoginRequest):
    """Login with Government ID and password. Returns session token + role."""
    result = login_user(req)
    status_code = 200 if result.get("success") else 401
    return JSONResponse(content=result, status_code=status_code)


@auth_router.get("/me")
def api_me(authorization: Optional[str] = Header(None)):
    """Returns current user profile from Authorization header token."""
    token = None
    if authorization:
        # Accept "Bearer <token>" or just "<token>"
        parts = authorization.strip().split()
        token = parts[-1] if parts else None

    if not token:
        return JSONResponse(content={"error": "No token provided."}, status_code=401)

    user = get_user_from_token(token)
    if not user:
        return JSONResponse(content={"error": "Invalid or expired session."}, status_code=401)

    return JSONResponse(content={
        "gov_id": user.gov_id,
        "full_name": user.full_name,
        "email": user.email,
        "department": user.department,
        "role": user.role,
        "is_verified": user.is_verified
    })


@auth_router.post("/logout")
def api_logout(authorization: Optional[str] = Header(None)):
    """Invalidates the current session token."""
    token = None
    if authorization:
        parts = authorization.strip().split()
        token = parts[-1] if parts else None

    if not token:
        return JSONResponse(content={"error": "No token provided."}, status_code=400)

    result = logout_user(token)
    return JSONResponse(content=result)
