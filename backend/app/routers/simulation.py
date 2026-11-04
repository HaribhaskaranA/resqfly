"""Simulation Control & Environment API for RESQFLY."""
from fastapi import APIRouter
from typing import Dict, Any
from app.models.simulation import SimulationState
from app.core.state import store

simulation_router = APIRouter(prefix="/simulation", tags=["Simulation Controls"])

@simulation_router.get("/state")
def get_simulation_state():
    return {
        "simulation": store.sim_state,
        "buildings": store.buildings,
        "people_clusters": store.people_clusters,
        "drones": list(store.drones.values()),
        "shelters": list(store.shelters.values())
    }

@simulation_router.post("/start")
def start_simulation():
    store.sim_state.is_running = True
    return {"status": "started", "is_running": True}

@simulation_router.post("/pause")
def pause_simulation():
    store.sim_state.is_running = False
    return {"status": "paused", "is_running": False}

@simulation_router.post("/reset")
def reset_simulation():
    store.reset_to_default_state()
    return {"status": "reset", "simulation": store.sim_state}

@simulation_router.post("/flood-level")
def change_flood_level(payload: Dict[str, Any]):
    new_level = float(payload.get("level", 1.5))
    store.set_flood_level(new_level)
    return {
        "status": "updated",
        "flood_water_level": store.sim_state.flood_water_level,
        "total_buildings_submerged": store.sim_state.total_buildings_submerged
    }

@simulation_router.post("/tick")
def advance_tick(payload: Dict[str, Any] = None):
    dt = float(payload.get("delta_time_sec", 1.0)) if payload else 1.0
    store.update_simulation_tick(dt)
    return {
        "status": "ticked",
        "sim_time_sec": store.sim_state.sim_time_sec,
        "missions_active": len([m for m in store.missions.values() if m.status == 'in_progress'])
    }
