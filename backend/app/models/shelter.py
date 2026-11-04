"""Shelter risk and status models for RESQFLY."""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from app.models.drone import DronePosition

class ShelterContributingFactors(BaseModel):
    water_threat_score: float = Field(0.0, description="Threat from water depth vs elevation (0-30 pts)")
    flood_trend_penalty: float = Field(0.0, description="Penalty for rising/rapid surge (0-15 pts)")
    isolation_score: float = Field(0.0, description="Risk from cut-off roads (0-20 pts)")
    occupancy_overload: float = Field(0.0, description="Over-capacity stress factor (0-15 pts)")
    supply_depletion: float = Field(0.0, description="Lack of water/food/meds (0-15 pts)")
    structural_damage_penalty: float = Field(0.0, description="Reported facade/foundation issues (0-25 pts)")
    notes: List[str] = Field(default_factory=list)

class ShelterAssessment(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Advisory risk indicator (0-100)")
    risk_level: str = Field(..., description="Low (0-29) | Moderate (30-59) | High (60-79) | Critical (80-100)")
    contributing_factors: ShelterContributingFactors
    recommended_review_priority: str = Field(..., description="Routine | Priority | Urgent Escalation")
    human_review_status: str = Field(default="pending", description="pending | verified | action_dispatched")
    reviewer_notes: Optional[str] = None
    assessed_at: str
    advisory_notice: str = "ADVISORY SIMULATION INDICATOR — Not a structural safety certification. Evacuation orders must be approved by human rescue coordinators."

class ShelterModel(BaseModel):
    id: str
    name: str
    building_type: str # school | church | hospital | community_hall
    position: DronePosition
    elevation_meters: float
    capacity: int
    current_occupancy: int
    local_flood_depth_m: float = 0.0
    flood_trend: str = "rising" # rising | stable | receding
    road_accessible: bool = True
    structural_damage_reported: bool = False
    food_hours_remaining: float = 24.0
    water_hours_remaining: float = 18.0
    medical_supplies_adequate: bool = True
    current_assessment: Optional[ShelterAssessment] = None
