"""Explainable Emergency Priority Engine for RESQFLY."""
from typing import Tuple, List
from app.models.request import EmergencyRequestModel

def calculate_emergency_priority(req: EmergencyRequestModel, local_flood_depth: float = 1.0) -> Tuple[float, List[str]]:
    """Calculates an explainable priority score (0-100) for an emergency relief request."""
    score = 20.0 # base score
    factors: List[str] = []

    # 1. Number of affected people
    count = req.affected_people_count
    if count >= 20:
        score += 25.0
        factors.append(f"Large group ({count} individuals affected) [+25 pts]")
    elif count >= 10:
        score += 18.0
        factors.append(f"Medium group ({count} individuals affected) [+18 pts]")
    elif count >= 4:
        score += 12.0
        factors.append(f"Family group ({count} individuals affected) [+12 pts]")
    else:
        score += 5.0
        factors.append(f"Small party ({count} individuals) [+5 pts]")

    # 2. Vulnerable individuals
    if req.vulnerable_persons:
        score += 20.0
        factors.append("Presence of vulnerable persons (infants/elderly/disabled) [+20 pts]")

    # 3. Medical Urgency
    urgency = req.medical_urgency.lower()
    if urgency == "life_threatening":
        score += 35.0
        factors.append("CRITICAL: Life-threatening medical emergency [+35 pts]")
    elif urgency == "high":
        score += 25.0
        factors.append("Severe injury or prescription dependency [+25 pts]")
    elif urgency == "medium":
        score += 15.0
        factors.append("Moderate medical attention or first-aid needed [+15 pts]")
    elif urgency == "low":
        score += 5.0
        factors.append("Minor first-aid request [+5 pts]")

    # 4. Immediate Hazard & Shelter Status
    s_status = req.shelter_status.lower()
    if "submersion" in s_status or local_flood_depth > 1.8:
        score += 25.0
        factors.append("Imminent flood submersion / structural collapse risk [+25 pts]")
    elif "rooftop" in s_status:
        score += 15.0
        factors.append("Stranded on exposed rooftop surrounded by floodwater [+15 pts]")

    # 5. Supply Urgency
    if req.water_req_liters > 15 or req.food_req_packs > 15:
        score += 10.0
        factors.append("Substantial dehydration or nourishment shortage [+10 pts]")

    final_score = min(100.0, max(5.0, round(score, 1)))
    return final_score, factors
