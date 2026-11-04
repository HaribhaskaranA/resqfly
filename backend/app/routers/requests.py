"""Emergency Relief Requests & Inventory API for RESQFLY."""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
import time
from app.models.request import EmergencyRequestModel, ReliefInventoryItem
from app.models.drone import DronePosition
from app.core.state import store
from app.core.priority_engine import calculate_emergency_priority
from app.aws.adapter import aws_adapter

requests_router = APIRouter(prefix="/requests", tags=["Emergency Requests"])

@requests_router.get("", response_model=List[EmergencyRequestModel])
def list_requests():
    return list(store.requests.values())

@requests_router.get("/inventory", response_model=List[ReliefInventoryItem])
def get_inventory():
    return list(store.inventory.values())

@requests_router.post("", response_model=EmergencyRequestModel)
def create_emergency_request(payload: Dict[str, Any]):
    req_id = payload.get("id") or f"REQ-{int(time.time() * 1000) % 100000}"
    pos_data = payload.get("position", {"x": 0.0, "y": 2.0, "z": 0.0})
    pos = DronePosition(**pos_data)

    req = EmergencyRequestModel(
        id=req_id,
        location_name=payload.get("location_name", "Unmapped Coastal Sector"),
        position=pos,
        affected_people_count=int(payload.get("affected_people_count", 2)),
        water_req_liters=int(payload.get("water_req_liters", 4)),
        food_req_packs=int(payload.get("food_req_packs", 4)),
        first_aid_kits_req=int(payload.get("first_aid_kits_req", 1)),
        medical_urgency=payload.get("medical_urgency", "medium"),
        vulnerable_persons=bool(payload.get("vulnerable_persons", False)),
        shelter_status=payload.get("shelter_status", "dry_ground"),
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat()
    )

    priority_score, factors = calculate_emergency_priority(req, local_flood_depth=store.sim_state.flood_water_level)
    req.priority_score = priority_score
    req.priority_factors = factors

    store.requests[req_id] = req
    aws_adapter.sync_to_dynamodb("requests", req.model_dump())

    return req

@requests_router.post("/{req_id}/status")
def update_request_status(req_id: str, payload: Dict[str, Any]):
    req = store.requests.get(req_id.upper())
    if not req:
        raise HTTPException(status_code=404, detail=f"Request {req_id} not found.")

    if "status" in payload:
        req.status = payload["status"]
        req.updated_at = datetime.now(timezone.utc).isoformat()

    return {"status": "updated", "request": req}
