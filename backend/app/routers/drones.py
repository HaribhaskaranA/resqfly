"""Drone Fleet Management API for RESQFLY."""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone
from app.models.drone import DroneModel
from app.core.state import store
from app.aws.adapter import aws_adapter

drones_router = APIRouter(prefix="/drones", tags=["Drones"])

@drones_router.get("", response_model=List[DroneModel])
def list_drones():
    return list(store.drones.values())

@drones_router.get("/{drone_id}", response_model=DroneModel)
def get_drone(drone_id: str):
    drone = store.drones.get(drone_id.upper())
    if not drone:
        raise HTTPException(status_code=404, detail=f"Drone {drone_id} not found in fleet.")
    return drone

@drones_router.post("/{drone_id}/launch")
def launch_drone(drone_id: str, payload: dict = None):
    drone = store.drones.get(drone_id.upper())
    if not drone:
        raise HTTPException(status_code=404, detail=f"Drone {drone_id} not found.")

    if drone.battery < 20.0:
        raise HTTPException(status_code=400, detail=f"Cannot launch {drone.name}: Low battery ({drone.battery}%).")

    drone.status = "taking_off"
    drone.altitude = 25.0
    drone.last_telemetry_ts = datetime.now(timezone.utc).isoformat()

    # Publish telemetry to AWS IoT
    aws_adapter.publish_iot_telemetry(
        topic=f"resqfly/drone/{drone.id}/telemetry",
        payload=drone.model_dump()
    )

    return {
        "status": "launched",
        "drone_id": drone.id,
        "name": drone.name,
        "drone_status": drone.status,
        "altitude": drone.altitude
    }
