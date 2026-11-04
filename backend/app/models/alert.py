"""Alert & Incident models for RESQFLY Operations Center."""
from typing import Optional, List
from pydantic import BaseModel, Field

class AlertModel(BaseModel):
    id: str
    level: str = Field(..., description="info | warning | high | critical")
    source: str = Field(..., description="shelter_engine | drone_telemetry | weather | detection | relief")
    title: str
    message: str
    target_id: Optional[str] = None # e.g. SHELTER-01, DRONE-03, REQ-002
    created_at: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    action_required: bool = True
