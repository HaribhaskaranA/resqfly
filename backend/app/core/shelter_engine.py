"""Shelter Risk Assessment Engine for RESQFLY."""
from datetime import datetime, timezone
from app.models.shelter import ShelterModel, ShelterAssessment, ShelterContributingFactors

def calculate_shelter_risk(shelter: ShelterModel, flood_water_level: float) -> ShelterAssessment:
    """Computes a transparent, explainable 0-100 advisory risk score for a shelter."""
    water_threat = 0.0
    notes = []

    # 1. Water threat vs elevation (0 to 30 points)
    # If flood water level reaches or exceeds shelter elevation, water enters ground floor
    elevation_diff = flood_water_level - shelter.elevation_meters
    if elevation_diff > 1.0:
        water_threat = 30.0
        notes.append(f"Severe inundation: flood level exceeds elevation by {elevation_diff:.2f}m")
    elif elevation_diff > 0.0:
        water_threat = 20.0 + (elevation_diff * 10.0)
        notes.append(f"Floor breach: flood level exceeds foundation by {elevation_diff:.2f}m")
    elif elevation_diff > -0.5:
        water_threat = 12.0
        notes.append("Perimeter floodwater within 0.5m of entry threshold")
    else:
        water_threat = max(0.0, 5.0 - abs(elevation_diff))

    # 2. Flood trend penalty (0 to 15 points)
    trend_penalty = 0.0
    if shelter.flood_trend.lower() == "rising":
        trend_penalty = 15.0
        notes.append("Active flood surge: water level actively rising")
    elif shelter.flood_trend.lower() == "stable":
        trend_penalty = 5.0
        notes.append("Flood plateau: stagnant water with sustained pressure")
    else:
        trend_penalty = 0.0
        notes.append("Receding flood line")

    # 3. Isolation / Road accessibility risk (0 to 20 points)
    isolation_score = 0.0
    if not shelter.road_accessible:
        isolation_score = 20.0
        notes.append("Road cut-off: ground evacuation routes completely submerged")
    else:
        isolation_score = 0.0

    # 4. Occupancy overload (0 to 15 points)
    occupancy_overload = 0.0
    if shelter.capacity > 0:
        ratio = shelter.current_occupancy / shelter.capacity
        if ratio > 1.25:
            occupancy_overload = 15.0
            notes.append(f"Severe overcrowding: {int(ratio * 100)}% of rated capacity")
        elif ratio > 1.0:
            occupancy_overload = 10.0
            notes.append(f"Above rated capacity: {shelter.current_occupancy}/{shelter.capacity} occupants")
        elif ratio > 0.8:
            occupancy_overload = 5.0

    # 5. Supply depletion (0 to 15 points)
    supply_depletion = 0.0
    if shelter.water_hours_remaining < 6:
        supply_depletion += 6.0
        notes.append("Critical drinking water shortage (< 6 hours remaining)")
    elif shelter.water_hours_remaining < 12:
        supply_depletion += 3.0

    if shelter.food_hours_remaining < 6:
        supply_depletion += 5.0
        notes.append("Critical food shortage (< 6 hours remaining)")
    elif shelter.food_hours_remaining < 12:
        supply_depletion += 2.5

    if not shelter.medical_supplies_adequate:
        supply_depletion += 4.0
        notes.append("Depleted medical first-aid reserves")

    # 6. Structural damage penalty (0 to 25 points)
    damage_penalty = 0.0
    if shelter.structural_damage_reported:
        damage_penalty = 25.0
        notes.append("Reported structural compromise: cracked masonry / roof stress")

    total_score = min(100.0, water_threat + trend_penalty + isolation_score + occupancy_overload + supply_depletion + damage_penalty)
    total_score = round(total_score, 1)

    # Classify Risk Level
    if total_score >= 80.0:
        level = "Critical"
        priority = "Urgent Escalation"
    elif total_score >= 60.0:
        level = "High"
        priority = "Priority"
    elif total_score >= 30.0:
        level = "Moderate"
        priority = "Standard"
    else:
        level = "Low"
        priority = "Routine"

    factors = ShelterContributingFactors(
        water_threat_score=round(water_threat, 1),
        flood_trend_penalty=round(trend_penalty, 1),
        isolation_score=round(isolation_score, 1),
        occupancy_overload=round(occupancy_overload, 1),
        supply_depletion=round(supply_depletion, 1),
        structural_damage_penalty=round(damage_penalty, 1),
        notes=notes
    )

    assessment = ShelterAssessment(
        risk_score=total_score,
        risk_level=level,
        contributing_factors=factors,
        recommended_review_priority=priority,
        human_review_status=shelter.current_assessment.human_review_status if shelter.current_assessment else "pending",
        assessed_at=datetime.now(timezone.utc).isoformat()
    )

    return assessment
