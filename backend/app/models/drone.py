"""Drone model definition for RESQFLY Multi-Drone Fleet."""
from typing import List, Optional
from pydantic import BaseModel, Field

class DronePosition(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class DroneModel(BaseModel):
    id: str = Field(..., description="Unique drone identifier (e.g. DRONE-01)")
    name: str = Field(..., description="Callsign name (e.g. SCOUT-ALPHA)")
    role: str = Field(..., description="Specialized fleet responsibility")
    category: str = Field(..., description="scout | guardian | lifeline | relay")
    position: DronePosition = Field(default_factory=DronePosition)
    altitude: float = Field(default=0.0, description="Altitude in meters")
    battery: float = Field(default=100.0, ge=0.0, le=100.0, description="Battery percentage")
    speed: float = Field(default=12.0, description="Speed in m/s")
    max_payload_kg: float = Field(default=5.0, description="Max cargo weight capacity in kg")
    current_payload_kg: float = Field(default=0.0, description="Current carried weight in kg")
    status: str = Field(default="idle", description="idle | taking_off | flying | hovering | scanning | delivering | returning | landed")
    assigned_mission_id: Optional[str] = None
    destination: Optional[DronePosition] = None
    mission_progress: float = Field(default=0.0, ge=0.0, le=100.0)
    signal_strength: float = Field(default=98.0, description="Radio link quality %")
    last_telemetry_ts: str = Field(default="", description="ISO timestamp of last telemetry ping")
