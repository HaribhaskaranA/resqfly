"""Shelter Safety & Risk Assessment API for RESQFLY."""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.models.shelter import ShelterModel, ShelterAssessment
from app.core.state import store
from app.core.shelter_engine import calculate_shelter_risk

shelters_router = APIRouter(prefix="/shelters", tags=["Shelters"])

@shelters_router.get("", response_model=List[ShelterModel])
def list_shelters():
    return list(store.shelters.values())

@shelters_router.get("/{shelter_id}/assessment", response_model=ShelterAssessment)
def get_shelter_assessment(shelter_id: str):
    shelter = store.shelters.get(shelter_id.upper())
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter {shelter_id} not found.")

    assessment = calculate_shelter_risk(shelter, store.sim_state.flood_water_level)
    shelter.current_assessment = assessment
    return assessment

@shelters_router.post("/{shelter_id}/assessment", response_model=ShelterAssessment)
def update_shelter_assessment(shelter_id: str, updates: Dict[str, Any]):
    shelter = store.shelters.get(shelter_id.upper())
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter {shelter_id} not found.")

    if "current_occupancy" in updates:
        shelter.current_occupancy = int(updates["current_occupancy"])
    if "flood_trend" in updates:
        shelter.flood_trend = str(updates["flood_trend"])
    if "road_accessible" in updates:
        shelter.road_accessible = bool(updates["road_accessible"])
    if "structural_damage_reported" in updates:
        shelter.structural_damage_reported = bool(updates["structural_damage_reported"])
    if "food_hours_remaining" in updates:
        shelter.food_hours_remaining = float(updates["food_hours_remaining"])
    if "water_hours_remaining" in updates:
        shelter.water_hours_remaining = float(updates["water_hours_remaining"])

    assessment = calculate_shelter_risk(shelter, store.sim_state.flood_water_level)
    shelter.current_assessment = assessment
    return assessment

@shelters_router.post("/{shelter_id}/verify")
def verify_shelter(shelter_id: str, payload: Dict[str, Any] = None):
    shelter = store.shelters.get(shelter_id.upper())
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter {shelter_id} not found.")

    status = payload.get("status", "verified") if payload else "verified"
    notes = payload.get("notes", "Verified by on-duty Rescue Coordinator via field scout telemetry.") if payload else "Verified"
    
    if shelter.current_assessment:
        shelter.current_assessment.human_review_status = status
        shelter.current_assessment.reviewer_notes = notes

    return {
        "status": "updated",
        "shelter_id": shelter.id,
        "human_review_status": status,
        "notes": notes
    }
