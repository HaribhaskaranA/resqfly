"""Intelligent Mission Operations API for RESQFLY."""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
import time
from app.models.mission import MissionModel
from app.models.drone import DronePosition
from app.core.state import store
from app.core.mission_engine import assign_optimal_drone
from app.aws.adapter import aws_adapter

missions_router = APIRouter(prefix="/missions", tags=["Missions"])

@missions_router.get("", response_model=List[MissionModel])
def list_missions():
    return list(store.missions.values())

@missions_router.post("/assign")
def assign_mission(payload: Dict[str, Any]):
    """Runs transparent multi-drone suitability algorithm and assigns the optimal drone."""
    mission_type = payload.get("type", "supply_delivery")
    target_loc_data = payload.get("target_location", {"x": -110.0, "y": 1.5, "z": -30.0})
    target_pos = DronePosition(**target_loc_data)
    req_payload_kg = float(payload.get("required_payload_kg", 2.0))
    target_id = payload.get("target_id")
    title = payload.get("title", f"Relief Mission for {target_id or 'Target Location'}")

    mission_id = f"MSN-{int(time.time() * 1000) % 100000}"
    candidate_mission = MissionModel(
        id=mission_id,
        type=mission_type,
        title=title,
        target_location=target_pos,
        target_id=target_id,
        required_payload_kg=req_payload_kg,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat()
    )

    all_drones = list(store.drones.values())
    selected_drone, suitability_scores, rationale, calculated_route = assign_optimal_drone(
        drones=all_drones,
        mission=candidate_mission
    )

    candidate_mission.suitability_breakdown = suitability_scores
    candidate_mission.selection_rationale = rationale

    if not selected_drone:
        # Save unassigned mission for review
        store.missions[mission_id] = candidate_mission
        return {
            "status": "unassigned",
            "mission": candidate_mission,
            "reasons": [s.rejection_reasons for s in suitability_scores if not s.is_eligible],
            "rationale": rationale
        }

    # Assign and initiate mission
    candidate_mission.assigned_drone_id = selected_drone.id
    candidate_mission.calculated_route = calculated_route
    candidate_mission.status = "in_progress"
    candidate_mission.started_at = datetime.now(timezone.utc).isoformat()
    candidate_mission.estimated_duration_sec = 45.0

    # Update drone state
    selected_drone.status = "flying"
    selected_drone.assigned_mission_id = mission_id
    selected_drone.destination = target_pos
    selected_drone.current_payload_kg = req_payload_kg

    # If linked to emergency request, update request status to assigned
    if target_id and target_id in store.requests:
        req = store.requests[target_id]
        req.status = "assigned"
        req.assigned_drone_id = selected_drone.id
        req.assigned_mission_id = mission_id
        req.updated_at = datetime.now(timezone.utc).isoformat()

    store.missions[mission_id] = candidate_mission

    # Sync to AWS DynamoDB & IoT Core
    aws_adapter.sync_to_dynamodb("missions", candidate_mission.model_dump())
    aws_adapter.publish_iot_telemetry(
        topic=f"resqfly/drone/{selected_drone.id}/command",
        payload={
            "action": "START_MISSION",
            "mission_id": mission_id,
            "target": target_pos.model_dump(),
            "route_waypoints_count": len(calculated_route)
        }
    )

    return {
        "status": "assigned",
        "selected_drone": selected_drone,
        "mission": candidate_mission,
        "rationale": rationale,
        "suitability_breakdown": suitability_scores
    }

@missions_router.post("")
def create_mission(mission: MissionModel):
    store.missions[mission.id] = mission
    return mission

@missions_router.post("/dispatch")
def direct_dispatch(payload: Dict[str, Any]):
    action = payload.get("action", "DISPATCH_RESCUE_BOAT")
    target_name = payload.get("target_name") or payload.get("sector") or "North Haven Coastal Sector"
    status = payload.get("status", "en_route")
    notes = payload.get("notes", "Field unit acknowledged & deployed")
    asset = payload.get("asset", "RESCUE FLEET • Alpha Watercraft Unit")
    victims = int(payload.get("victims_count", 4))
    depth = float(payload.get("flood_depth_m", 1.8))
    coords = payload.get("waypoint_coords", [-110.0, -30.0])

    record = {
        "id": f"MH-{len(store.mission_history) + 1:04d}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sector": target_name,
        "waypoint_coords": coords,
        "mode": "field_dispatch",
        "dispatched_asset": asset,
        "action": action,
        "payload_kg": float(payload.get("payload_kg", 0.0)),
        "flood_depth_m": depth,
        "victims_count": victims,
        "status": status,
        "drone_callsign": payload.get("drone_callsign", "SCOUT-ALPHA"),
        "notes": notes
    }
    store.mission_history.insert(0, record)
    aws_adapter.sync_to_dynamodb("missions", record)
    return {"status": "ok", "mission": record}
