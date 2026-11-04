"""Detection model definitions for RESQFLY Human Detection Center."""
from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: float # normalized or pixel coordinate
    y: float
    width: float
    height: float
    confidence: float
    class_name: str = "person"

class DetectionObservation(BaseModel):
    id: str
    source_type: str = Field(..., description="'sample_video_ai' | 'synthetic_3d_simulation'")
    image_or_video_url: Optional[str] = None
    frame_number: int = 1
    detected_count: int
    confidence_avg: float
    bounding_boxes: List[BoundingBox] = Field(default_factory=list)
    location_estimate: str = "Zone 3 - North Canal Outskirts"
    geo_coords_simulated: Optional[List[float]] = None # [x, y, z] in simulation
    flood_depth_meters: Optional[float] = 0.0
    flood_submersion_pct: Optional[float] = 0.0
    landmark_reference: Optional[str] = None
    verification_status: str = Field(default="unverified", description="unverified | verified | rejected")
    verified_by: Optional[str] = None
    timestamp: str = ""
    notes: Optional[str] = None
    disclaimer: str = "YOLO inference detects visual person silhouettes only. It does not infer medical condition, entrapment status, or calibrated GPS coordinates."
