"""Intelligent Mission Assignment Engine for RESQFLY Multi-Drone Fleet."""
import math
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from app.models.drone import DroneModel, DronePosition
from app.models.mission import MissionModel, DroneSuitabilityScore, RouteWaypoint
from app.core.a_star import planner_instance

MAX_OPERATIONAL_RANGE_M = 1500.0
BATTERY_DRAIN_PER_100M = 3.0 # % battery consumed per 100 meters
MIN_SAFE_BATTERY_RESERVE = 20.0 # Must finish mission with >= 20% battery

def calculate_distance(p1: DronePosition, p2: DronePosition) -> float:
    return math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2)

def evaluate_drone_suitability(
    drone: DroneModel,
    mission_type: str,
    target_pos: DronePosition,
    required_payload_kg: float
) -> DroneSuitabilityScore:
    """Evaluates suitability formula S = 0.35P + 0.25L + 0.20D + 0.20C and checks hard constraints."""
    rejection_reasons: List[str] = []
    is_eligible = True

    # 1. Hard constraint: Availability
    if drone.status not in ["idle", "landed", "hovering"]:
        is_eligible = False
        rejection_reasons.append(f"Drone is currently busy (status: {drone.status})")

    # 2. Hard constraint: Distance & Range
    dist_one_way = calculate_distance(drone.position, target_pos)
    dist_round_trip = dist_one_way * 2.0
    if dist_one_way > MAX_OPERATIONAL_RANGE_M:
        is_eligible = False
        rejection_reasons.append(f"Target distance ({dist_one_way:.1f}m) exceeds max operational radius ({MAX_OPERATIONAL_RANGE_M}m)")

    # 3. Hard constraint: Battery Reserve
    estimated_battery_drain = (dist_round_trip / 100.0) * BATTERY_DRAIN_PER_100M
    projected_battery_after = drone.battery - estimated_battery_drain
    if projected_battery_after < MIN_SAFE_BATTERY_RESERVE:
        is_eligible = False
        rejection_reasons.append(
            f"Insufficient battery reserve: requires {estimated_battery_drain:.1f}% drain. "
            f"Projected remaining battery {projected_battery_after:.1f}% is below required safe buffer ({MIN_SAFE_BATTERY_RESERVE}%)"
        )

    # 4. Hard constraint: Payload Capacity
    if required_payload_kg > drone.max_payload_kg:
        is_eligible = False
        rejection_reasons.append(
            f"Payload constraint violation: requires {required_payload_kg:.1f}kg, but max capacity is {drone.max_payload_kg:.1f}kg"
        )

    # Calculate Normalized Factor P: Battery Suitability (0 - 100)
    p_score = max(0.0, min(100.0, projected_battery_after))

    # Calculate Normalized Factor L: Payload Suitability (0 - 100)
    if required_payload_kg == 0:
        l_score = 100.0
    elif required_payload_kg > drone.max_payload_kg:
        l_score = 0.0
    else:
        # Higher score for carrying close to optimal load without overburdening
        spare_ratio = (drone.max_payload_kg - required_payload_kg) / drone.max_payload_kg
        l_score = round(60.0 + spare_ratio * 40.0, 1)

    # Calculate Normalized Factor D: Distance Suitability (0 - 100)
    d_ratio = max(0.0, 1.0 - (dist_one_way / MAX_OPERATIONAL_RANGE_M))
    d_score = round(d_ratio * 100.0, 1)

    # Calculate Normalized Factor C: Capability Suitability (0 - 100)
    c_score = 10.0
    m_type = mission_type.lower()
    cat = drone.category.lower()

    if m_type == "search":
        if cat == "scout":
            c_score = 100.0
        elif cat == "guardian":
            c_score = 65.0
        elif cat == "relay":
            c_score = 50.0
        else:
            c_score = 30.0
    elif m_type == "shelter_inspection":
        if cat == "guardian":
            c_score = 100.0
        elif cat == "scout":
            c_score = 65.0
        elif cat == "relay":
            c_score = 50.0
        else:
            c_score = 25.0
    elif m_type == "supply_delivery":
        if cat == "lifeline":
            c_score = 100.0
        elif drone.max_payload_kg >= required_payload_kg and required_payload_kg > 0:
            c_score = 40.0
        else:
            c_score = 10.0
    elif m_type == "route_monitoring":
        if cat == "relay":
            c_score = 100.0
        elif cat == "scout":
            c_score = 70.0
        elif cat == "guardian":
            c_score = 50.0
        else:
            c_score = 30.0

    # Total Transparent Suitability Formula: S = 0.35P + 0.25L + 0.20D + 0.20C
    total_score = (0.35 * p_score) + (0.25 * l_score) + (0.20 * d_score) + (0.20 * c_score)
    total_score = round(total_score, 1)

    return DroneSuitabilityScore(
        drone_id=drone.id,
        battery_score=p_score,
        payload_score=l_score,
        distance_score=d_score,
        capability_score=c_score,
        total_score=total_score if is_eligible else 0.0,
        is_eligible=is_eligible,
        rejection_reasons=rejection_reasons
    )

def assign_optimal_drone(
    drones: List[DroneModel],
    mission: MissionModel
) -> Tuple[Optional[DroneModel], List[DroneSuitabilityScore], str, List[RouteWaypoint]]:
    """Evaluates all drones, selects best candidate, and computes flight plan."""
    scores: List[DroneSuitabilityScore] = []

    for drone in drones:
        score = evaluate_drone_suitability(
            drone=drone,
            mission_type=mission.type,
            target_pos=mission.target_location,
            required_payload_kg=mission.required_payload_kg
        )
        scores.append(score)

    # Filter eligible drones and sort by total score descending
    eligible_scores = [s for s in scores if s.is_eligible]
    eligible_scores.sort(key=lambda s: s.total_score, reverse=True)

    if not eligible_scores:
        rationale = "No available drone satisfied hard constraints (range, battery buffer, payload capacity, or availability)."
        return None, scores, rationale, []

    best_score = eligible_scores[0]
    selected_drone = next(d for d in drones if d.id == best_score.drone_id)

    # Generate explainability rationale
    dist = calculate_distance(selected_drone.position, mission.target_location)
    rationale = (
        f"Selected {selected_drone.name} ({selected_drone.id}) with highest suitability index {best_score.total_score}/100. "
        f"Battery rating: {best_score.battery_score}%, Cargo suitability: {best_score.payload_score}%, "
        f"Range proximity: {dist:.1f}m, Mission capability match: {best_score.capability_score}%."
    )

    # Calculate 3D Waypoints
    start_tuple = (selected_drone.position.x, selected_drone.position.y, selected_drone.position.z)
    goal_tuple = (mission.target_location.x, mission.target_location.y, mission.target_location.z)
    flight_route = planner_instance.plan_path(start_tuple, goal_tuple, cruise_alt=28.0)

    return selected_drone, scores, rationale, flight_route
