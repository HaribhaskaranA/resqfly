"""Mission model definition for RESQFLY Autonomous Operations."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.drone import DronePosition

class RouteWaypoint(BaseModel):
    x: float
    y: float
    z: float
    action: Optional[str] = "fly_through"

class DroneSuitabilityScore(BaseModel):
    drone_id: str
    battery_score: float # P (0-100)
    payload_score: float # L (0-100)
    distance_score: float # D (0-100)
    capability_score: float # C (0-100)
    total_score: float # S = 0.35P + 0.25L + 0.20D + 0.20C
    is_eligible: bool
    rejection_reasons: List[str] = []

class MissionModel(BaseModel):
    id: str = Field(..., description="Unique mission ID (e.g. MSN-2026-101)")
    type: str = Field(..., description="search | shelter_inspection | supply_delivery | route_monitoring")
    title: str
    target_location: DronePosition
    target_id: Optional[str] = None # e.g. Shelter ID or Request ID
    priority: str = Field(default="medium", description="low | medium | high | critical")
    priority_score: float = Field(default=50.0, ge=0.0, le=100.0)
    required_payload_kg: float = 0.0
    supplies: Dict[str, int] = Field(default_factory=dict) # e.g. {"water": 5, "rations": 10}
    status: str = Field(default="pending", description="pending | assigned | in_progress | completed | failed | canceled")
    assigned_drone_id: Optional[str] = None
    selection_rationale: Optional[str] = None
    suitability_breakdown: List[DroneSuitabilityScore] = Field(default_factory=list)
    calculated_route: List[RouteWaypoint] = Field(default_factory=list)
    estimated_duration_sec: float = 0.0
    battery_required_est: float = 0.0
    mission_progress: float = 0.0
    created_at: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
