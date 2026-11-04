"""Emergency Request & Inventory models for RESQFLY."""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from app.models.drone import DronePosition

class ReliefInventoryItem(BaseModel):
    item_id: str
    name: str
    unit: str # bottles | ration_packs | kits | units
    available_qty: int
    reserved_qty: int
    minimum_threshold: int
    weight_kg_per_unit: float

class EmergencyRequestModel(BaseModel):
    id: str
    location_name: str
    position: DronePosition
    affected_people_count: int = Field(default=1, ge=1)
    water_req_liters: int = 5
    food_req_packs: int = 5
    first_aid_kits_req: int = 1
    medicine_packs_req: int = 0
    medical_urgency: str = Field(default="medium", description="none | low | medium | high | life_threatening")
    vulnerable_persons: bool = Field(default=False, description="Presence of infants, elderly, mobility impaired")
    shelter_status: str = Field(default="isolated_rooftop", description="dry_ground | isolated_rooftop | partial_submersion")
    priority_score: float = Field(default=50.0, ge=0.0, le=100.0)
    priority_factors: List[str] = Field(default_factory=list)
    status: str = Field(default="pending", description="pending | assigned | in_transit | delivered | verified")
    assigned_drone_id: Optional[str] = None
    assigned_mission_id: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""
