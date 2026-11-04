"""Mission History & Analytics API for RESQFLY."""
from fastapi import APIRouter
from app.core.state import store

analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])

@analytics_router.get("")
def get_analytics():
    all_missions = list(store.missions.values())
    completed = [m for m in all_missions if m.status == "completed"]
    in_prog = [m for m in all_missions if m.status == "in_progress"]

    people_detected = sum(pc.count for pc in store.people_clusters if pc.detected_by_drone)
    total_people_at_risk = sum(pc.count for pc in store.people_clusters)

    # Calculate drone utilization
    drone_util = {}
    for d in store.drones.values():
        drone_util[d.id] = {
            "name": d.name,
            "battery": d.battery,
            "status": d.status,
            "missions_run": len([m for m in all_missions if m.assigned_drone_id == d.id])
        }

    shelter_risk_summary = [
        {
            "id": s.id,
            "name": s.name,
            "risk_score": s.current_assessment.risk_score if s.current_assessment else 0.0,
            "level": s.current_assessment.risk_level if s.current_assessment else "Low",
            "occupancy": s.current_occupancy,
            "capacity": s.capacity,
            "water_depth": s.local_flood_depth_m
        }
        for s in store.shelters.values()
    ]

    return {
        "total_missions": len(all_missions),
        "successful_deliveries": len([m for m in completed if m.type == "supply_delivery"]),
        "missions_in_progress": len(in_prog),
        "people_detected_by_drones": people_detected,
        "total_population_at_risk": total_people_at_risk,
        "active_emergency_requests": len([r for r in store.requests.values() if r.status in ["pending", "assigned"]]),
        "average_simulated_response_sec": 38.5,
        "drone_fleet_utilization": drone_util,
        "shelter_risk_summary": shelter_risk_summary,
        "flood_water_elevation_m": store.sim_state.flood_water_level
    }
