"""Simulation state models for RESQFLY."""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class BuildingInfo(BaseModel):
    id: str
    name: str
    type: str # house | school | hospital | base | church | commercial
    x: float
    y: float # ground elevation
    z: float
    width: float
    height: float
    depth: float
    is_flooded: bool = False
    flood_depth_m: float = 0.0
    residents_count: int = 0
    status: str = "normal" # normal | risk | submerged | evacuated

class PeopleCluster(BaseModel):
    id: str
    zone_name: str
    x: float
    y: float
    z: float
    count: int
    detected_by_drone: bool = False
    detection_confidence: float = 0.0
    rescued: bool = False

class SimulationState(BaseModel):
    is_running: bool = True
    sim_time_sec: float = 0.0
    time_scale: float = 1.0 # 1.0x, 2.0x, etc.
    flood_water_level: float = 1.2 # in meters
    flood_surge_rate: float = 0.05 # meters/sec when active
    storm_intensity: str = "severe" # moderate | severe | hurricane
    wind_speed_knots: float = 24.5
    wind_direction_deg: float = 45.0
    rain_density: float = 0.75 # 0.0 - 1.0
    submerged_roads_count: int = 3
    total_buildings_submerged: int = 5
    last_updated: str = ""
