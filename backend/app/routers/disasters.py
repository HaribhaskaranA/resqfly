"""Health & Disaster API routers for RESQFLY."""
from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.state import store
from app.aws.adapter import aws_adapter

health_router = APIRouter(tags=["Health & Status"])
disasters_router = APIRouter(prefix="/disasters", tags=["Disasters"])

@health_router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "RESQFLY Operational Core",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cloud": aws_adapter.get_cloud_status()
    }

@disasters_router.get("")
def list_disasters():
    return [
        {
            "id": "DISASTER-2026-HALLOWEEN",
            "name": "Halloween Night Gale & Coastal Surge",
            "type": "Coastal Flood & Storm Surge",
            "location": "North Haven Coastal Village",
            "severity": "Category 3 Coastal Gale",
            "status": "active",
            "water_level_m": store.sim_state.flood_water_level,
            "affected_population_estimate": 120,
            "active_shelters": len(store.shelters),
            "created_at": "2026-10-31T20:00:00Z"
        }
    ]

@disasters_router.post("")
def update_disaster(payload: dict):
    if "water_level_m" in payload:
        store.set_flood_level(float(payload["water_level_m"]))
    return {"status": "updated", "water_level_m": store.sim_state.flood_water_level}
