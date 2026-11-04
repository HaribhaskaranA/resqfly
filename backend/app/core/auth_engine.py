"""Auth Engine — In-Memory Gov-ID Registration, OTP, and Session Management."""
import uuid
import hashlib
import random
import string
import time
from datetime import datetime, timezone
from typing import Optional, Dict
from app.models.auth import UserModel, RegisterRequest, OTPVerifyRequest, LoginRequest

# ─── Pre-seeded Allowed Government IDs ───────────────────────────────────────
# Format: GOV-DM-XXX = Disaster Management Command Center staff
#         FR-XXX     = Field Rescue Unit personnel
_ALLOWED_CMD_IDS = {f"GOV-DM-{str(i).zfill(3)}" for i in range(1, 51)}   # GOV-DM-001 .. GOV-DM-050
_ALLOWED_FR_IDS  = {f"FR-{str(i).zfill(3)}" for i in range(1, 101)}      # FR-001 .. FR-100

# Combined lookup with role mapping
_VALID_GOV_IDS: Dict[str, str] = {}
for gid in _ALLOWED_CMD_IDS:
    _VALID_GOV_IDS[gid] = "command_center"
for gid in _ALLOWED_FR_IDS:
    _VALID_GOV_IDS[gid] = "field_rescue"

# ─── In-Memory Stores ─────────────────────────────────────────────────────────
_users: Dict[str, UserModel] = {}           # keyed by gov_id
_sessions: Dict[str, str] = {}              # token → gov_id

# ─── Pre-seeded demo accounts (ready to use without registration) ─────────────
def _hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

# Demo: Coordinator
_users["GOV-DM-001"] = UserModel(
    id=str(uuid.uuid4()),
    full_name="Commander Alex Reyes",
    email="a.reyes@eoc.gov",
    department="Emergency Operations Center",
    gov_id="GOV-DM-001",
    password_hash=_hash_password("Demo@1234"),
    role="command_center",
    is_verified=True,
    created_at=datetime.now(timezone.utc).isoformat()
)
# Demo: Field Rescue
_users["FR-001"] = UserModel(
    id=str(uuid.uuid4()),
    full_name="Sergeant Priya Nair",
    email="p.nair@fieldrescue.gov",
    department="Coastal Field Rescue Unit",
    gov_id="FR-001",
    password_hash=_hash_password("Field@1234"),
    role="field_rescue",
    is_verified=True,
    created_at=datetime.now(timezone.utc).isoformat()
)

# ─── Auth Engine Functions ────────────────────────────────────────────────────

def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def register_user(req: RegisterRequest) -> dict:
    """Validates gov_id against allowed list, hashes password, generates OTP."""
    gid = req.gov_id.strip().upper()

    if gid not in _VALID_GOV_IDS:
        return {"success": False, "error": f"Government ID '{gid}' is not in the authorized personnel registry."}

    # Enforce role matches gov_id prefix
    expected_role = _VALID_GOV_IDS[gid]
    if req.role not in ("command_center", "field_rescue"):
        return {"success": False, "error": "Invalid role. Must be 'command_center' or 'field_rescue'."}

    if gid in _users and _users[gid].is_verified:
        return {"success": False, "error": "This Government ID is already registered. Please log in."}

    otp = _generate_otp()
    otp_expiry = time.time() + 300  # 5-minute window

    user = UserModel(
        id=str(uuid.uuid4()),
        full_name=req.full_name.strip(),
        email=req.email.strip().lower(),
        department=req.department.strip(),
        gov_id=gid,
        password_hash=_hash_password(req.password),
        role=expected_role,
        is_verified=False,
        otp_code=otp,
        otp_expires_at=otp_expiry,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    _users[gid] = user

    return {
        "success": True,
        "gov_id": gid,
        "role": expected_role,
        "otp_code": otp,  # Simulated — in production would be sent via email/SMS
        "otp_expires_in_seconds": 300,
        "message": f"Registration received. OTP sent to {req.email}. Valid for 5 minutes."
    }


def verify_otp(req: OTPVerifyRequest) -> dict:
    """Checks OTP match and expiry. Sets is_verified=True on success."""
    gid = req.gov_id.strip().upper()
    user = _users.get(gid)

    if not user:
        return {"success": False, "error": "User not found. Please register first."}

    if user.is_verified:
        return {"success": True, "message": "Account already verified. You may log in."}

    if not user.otp_code or user.otp_code != req.otp_code.strip():
        return {"success": False, "error": "Invalid OTP code. Please try again."}

    if user.otp_expires_at and time.time() > user.otp_expires_at:
        return {"success": False, "error": "OTP has expired. Please re-register to get a new code."}

    # Mark verified
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    return {"success": True, "message": "Identity verified. You may now log in.", "gov_id": gid}


def login_user(req: LoginRequest) -> dict:
    """Validates gov_id + password, returns session token."""
    gid = req.gov_id.strip().upper()
    user = _users.get(gid)

    if not user:
        return {"success": False, "error": "Government ID not found. Please register."}

    if not user.is_verified:
        return {"success": False, "error": "Account not verified. Complete OTP verification first."}

    if user.password_hash != _hash_password(req.password):
        return {"success": False, "error": "Invalid credentials. Please check your password."}

    # Issue session token
    token = str(uuid.uuid4())
    _sessions[token] = gid

    return {
        "success": True,
        "token": token,
        "role": user.role,
        "full_name": user.full_name,
        "gov_id": gid,
        "department": user.department,
        "message": "Authentication successful. Access granted."
    }


def get_user_from_token(token: str) -> Optional[UserModel]:
    """Returns UserModel for a valid session token, else None."""
    gid = _sessions.get(token)
    if not gid:
        return None
    return _users.get(gid)


def logout_user(token: str) -> dict:
    """Invalidates session token."""
    if token in _sessions:
        del _sessions[token]
        return {"success": True, "message": "Logged out."}
    return {"success": False, "error": "Session not found."}
