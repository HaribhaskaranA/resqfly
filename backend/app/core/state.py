"""Deterministic Simulation State and Single Source of Truth for RESQFLY."""
import time
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.models.drone import DroneModel, DronePosition
from app.models.mission import MissionModel, RouteWaypoint
from app.models.shelter import ShelterModel, ShelterAssessment
from app.models.request import EmergencyRequestModel, ReliefInventoryItem
from app.models.alert import AlertModel
from app.models.simulation import SimulationState, BuildingInfo, PeopleCluster
from app.models.detection import DetectionObservation
from app.core.shelter_engine import calculate_shelter_risk
from app.core.priority_engine import calculate_emergency_priority

class SimulationStore:
    def __init__(self):
        self.reset_to_default_state()

    def reset_to_default_state(self):
        """Initializes the coastal village, 4 specialized drones, 40 buildings, initial requests, and inventory."""
        self.sim_state = SimulationState(
            is_running=True,
            sim_time_sec=0.0,
            time_scale=1.0,
            flood_water_level=1.2, # Starting flood water level in meters
            flood_surge_rate=0.03, # meters per simulated 10 seconds
            storm_intensity="severe",
            wind_speed_knots=26.0,
            wind_direction_deg=40.0,
            rain_density=0.8,
            submerged_roads_count=2,
            total_buildings_submerged=4,
            last_updated=datetime.now(timezone.utc).isoformat()
        )

        # 1. Four Specialized Virtual Drones
        # Base Station location: x=0, y=10.0, z=0 (Elevated coastal cliff base)
        self.drones: Dict[str, DroneModel] = {
            "DRONE-01": DroneModel(
                id="DRONE-01",
                name="Drone Alpha • Thermal Recon & Search Scanner",
                role="Aerial Recon & Human Detection",
                category="scout",
                position=DronePosition(x=-15.0, y=12.0, z=5.0),
                altitude=12.0,
                battery=94.0,
                speed=16.0,
                max_payload_kg=3.0,
                current_payload_kg=0.0,
                status="idle",
                signal_strength=99.0,
                last_telemetry_ts=datetime.now(timezone.utc).isoformat()
            ),
            "DRONE-02": DroneModel(
                id="DRONE-02",
                name="Drone Bravo • Flood Surveillance & Depth Altimetry",
                role="Structural & Flood Altimetry",
                category="guardian",
                position=DronePosition(x=-5.0, y=12.0, z=5.0),
                altitude=12.0,
                battery=91.0,
                speed=14.0,
                max_payload_kg=4.0,
                current_payload_kg=0.0,
                status="idle",
                signal_strength=97.0,
                last_telemetry_ts=datetime.now(timezone.utc).isoformat()
            ),
            "DRONE-03": DroneModel(
                id="DRONE-03",
                name="Drone Charlie • Emergency Supply & Relief Cargo",
                role="Relief Supply Delivery",
                category="lifeline",
                position=DronePosition(x=5.0, y=12.0, z=5.0),
                altitude=12.0,
                battery=88.0,
                speed=12.0,
                max_payload_kg=15.0, # Heavy-lift supply transport
                current_payload_kg=0.0,
                status="idle",
                signal_strength=95.0,
                last_telemetry_ts=datetime.now(timezone.utc).isoformat()
            ),
            "DRONE-04": DroneModel(
                id="DRONE-04",
                name="Drone Delta • Tactical Mesh & Communications Relay",
                role="Communications & Mesh Route",
                category="relay",
                position=DronePosition(x=15.0, y=12.0, z=5.0),
                altitude=12.0,
                battery=96.0,
                speed=18.0,
                max_payload_kg=2.0,
                current_payload_kg=0.0,
                status="idle",
                signal_strength=100.0,
                last_telemetry_ts=datetime.now(timezone.utc).isoformat()
            )
        }

        # 2. Shelters
        self.shelters: Dict[str, ShelterModel] = {
            "SHELTER-01": ShelterModel(
                id="SHELTER-01",
                name="North Haven Community School",
                building_type="school",
                position=DronePosition(x=-75.0, y=2.0, z=-60.0),
                elevation_meters=2.2, # vulnerable when water rises above 2.0m!
                capacity=350,
                current_occupancy=130,
                local_flood_depth_m=1.1,
                flood_trend="rising",
                road_accessible=True,
                structural_damage_reported=False,
                food_hours_remaining=14.0,
                water_hours_remaining=10.0,
                medical_supplies_adequate=True
            ),
            "SHELTER-02": ShelterModel(
                id="SHELTER-02",
                name="Saint Jude Coastal Chapel",
                building_type="church",
                position=DronePosition(x=85.0, y=4.5, z=70.0),
                elevation_meters=5.8,
                capacity=120,
                current_occupancy=45,
                local_flood_depth_m=0.3,
                flood_trend="stable",
                road_accessible=True,
                structural_damage_reported=False,
                food_hours_remaining=28.0,
                water_hours_remaining=24.0,
                medical_supplies_adequate=True
            ),
            "HOSPITAL-01": ShelterModel(
                id="HOSPITAL-01",
                name="Harborview Regional Hospital",
                building_type="hospital",
                position=DronePosition(x=10.0, y=6.0, z=-110.0),
                elevation_meters=12.0,
                capacity=200,
                current_occupancy=185,
                local_flood_depth_m=0.0,
                flood_trend="stable",
                road_accessible=True,
                structural_damage_reported=False,
                food_hours_remaining=48.0,
                water_hours_remaining=40.0,
                medical_supplies_adequate=True
            ),
            "SHELTER-04": ShelterModel(
                id="SHELTER-04",
                name="East Ridge Community Hall",
                building_type="community_hall",
                position=DronePosition(x=90.0, y=9.5, z=55.0),
                elevation_meters=9.5,
                capacity=280,
                current_occupancy=92,
                local_flood_depth_m=0.0,
                flood_trend="stable",
                road_accessible=True,
                structural_damage_reported=False,
                food_hours_remaining=36.0,
                water_hours_remaining=30.0,
                medical_supplies_adequate=True
            )
        }

        # Initial assessment of shelters
        for s in self.shelters.values():
            s.current_assessment = calculate_shelter_risk(s, self.sim_state.flood_water_level)

        # 3. Relief Inventory
        self.inventory: Dict[str, ReliefInventoryItem] = {
            "WATER_L": ReliefInventoryItem(
                item_id="WATER_L",
                name="Drinking Water (2L bottles)",
                unit="bottles",
                available_qty=450,
                reserved_qty=30,
                minimum_threshold=100,
                weight_kg_per_unit=2.0
            ),
            "RATION_PACK": ReliefInventoryItem(
                item_id="RATION_PACK",
                name="High-Calorie Ready Food Ration",
                unit="ration_packs",
                available_qty=380,
                reserved_qty=25,
                minimum_threshold=80,
                weight_kg_per_unit=0.6
            ),
            "FIRST_AID": ReliefInventoryItem(
                item_id="FIRST_AID",
                name="Standard Trauma First-Aid Kit",
                unit="kits",
                available_qty=65,
                reserved_qty=6,
                minimum_threshold=15,
                weight_kg_per_unit=1.2
            ),
            "MED_PACK": ReliefInventoryItem(
                item_id="MED_PACK",
                name="Essential Chronic & Emergency Meds",
                unit="packs",
                available_qty=40,
                reserved_qty=4,
                minimum_threshold=10,
                weight_kg_per_unit=0.5
            ),
            "SAT_BEACON": ReliefInventoryItem(
                item_id="SAT_BEACON",
                name="Emergency Satellite Mesh Beacon",
                unit="units",
                available_qty=20,
                reserved_qty=2,
                minimum_threshold=5,
                weight_kg_per_unit=0.8
            )
        }

        # 4. Emergency Requests
        self.requests: Dict[str, EmergencyRequestModel] = {
            "REQ-101": EmergencyRequestModel(
                id="REQ-101",
                location_name="Fisherman Pier House #14",
                position=DronePosition(x=-110.0, y=1.5, z=-30.0),
                affected_people_count=8,
                water_req_liters=16,
                food_req_packs=12,
                first_aid_kits_req=2,
                medicine_packs_req=1,
                medical_urgency="high",
                vulnerable_persons=True,
                shelter_status="isolated_rooftop",
                priority_score=85.0,
                priority_factors=["Vulnerable individuals reported", "Trapped on roof with rising flood", "Immediate medical supplies needed"],
                status="pending",
                created_at=datetime.now(timezone.utc).isoformat()
            ),
            "REQ-102": EmergencyRequestModel(
                id="REQ-102",
                location_name="Old Mill Road Junction",
                position=DronePosition(x=45.0, y=2.0, z=-50.0),
                affected_people_count=4,
                water_req_liters=8,
                food_req_packs=6,
                first_aid_kits_req=1,
                medicine_packs_req=0,
                medical_urgency="medium",
                vulnerable_persons=False,
                shelter_status="dry_ground",
                priority_score=52.0,
                priority_factors=["Cut-off road access", "Family party of 4"],
                status="pending",
                created_at=datetime.now(timezone.utc).isoformat()
            ),
            "REQ-103": EmergencyRequestModel(
                id="REQ-103",
                location_name="West Harbor Storage Yard",
                position=DronePosition(x=-80.0, y=1.0, z=85.0),
                affected_people_count=14,
                water_req_liters=28,
                food_req_packs=20,
                first_aid_kits_req=3,
                medicine_packs_req=2,
                medical_urgency="urgent",
                vulnerable_persons=True,
                shelter_status="partial_submersion",
                priority_score=94.0,
                priority_factors=["Partial building inundation", "14 workers stranded", "Hypothermia risk"],
                status="pending",
                created_at=datetime.now(timezone.utc).isoformat()
            )
        }

        # 5. Active Missions
        self.missions: Dict[str, MissionModel] = {}

        # 6. Alerts
        self.alerts: List[AlertModel] = [
            AlertModel(
                id="ALT-001",
                level="high",
                source="weather",
                title="Halloween Storm Tide Warning",
                message="Coastal surge wave detected. Tide height predicted to exceed 2.4 meters within 40 minutes.",
                target_id=None,
                created_at=datetime.now(timezone.utc).isoformat(),
                acknowledged=False
            ),
            AlertModel(
                id="ALT-002",
                level="warning",
                source="shelter_engine",
                title="SHELTER-01 Access Road Submerging",
                message="North Canal road access to North Haven Community School is experiencing rising water (1.1m).",
                target_id="SHELTER-01",
                created_at=datetime.now(timezone.utc).isoformat(),
                acknowledged=False
            )
        ]

        # 7. Detection Observations
        self.observations: List[DetectionObservation] = []

        # 10. Mission History (Autonomous + Manual dispatches from AI patrol)
        self.mission_history: List[dict] = []

        # 8. Procedural Village Buildings (approx 36 buildings)
        self.buildings: List[BuildingInfo] = self._generate_village_buildings()

        # 9. Synthetic People Clusters
        self.people_clusters: List[PeopleCluster] = [
            PeopleCluster(id="PC-01", zone_name="West Pier House #14", x=-110.0, y=2.0, z=-30.0, count=8),
            PeopleCluster(id="PC-02", zone_name="West Harbor Storage Yard", x=-80.0, y=1.8, z=85.0, count=14),
            PeopleCluster(id="PC-03", zone_name="Old Mill Road Junction", x=45.0, y=2.2, z=-50.0, count=4),
            PeopleCluster(id="PC-04", zone_name="North Marsh Bungalow", x=-35.0, y=2.4, z=42.0, count=25), # Target for SCOUT in Demo Step 2!
            PeopleCluster(id="PC-05", zone_name="Lighthouse Promontory", x=-130.0, y=12.0, z=-120.0, count=3)
        ]

    def _generate_village_buildings(self) -> List[BuildingInfo]:
        """Generates realistic coastal village layout with Halloween architecture."""
        b_list = []
        # Key landmarks
        b_list.append(BuildingInfo(id="BASE-01", name="Coastal Command Operations Outpost", type="base", x=0.0, y=10.0, z=0.0, width=18.0, height=8.0, depth=14.0, residents_count=12))
        b_list.append(BuildingInfo(id="SHELTER-01", name="North Haven Community School", type="school", x=-75.0, y=2.0, z=-60.0, width=24.0, height=9.0, depth=16.0, residents_count=130))
        b_list.append(BuildingInfo(id="SHELTER-02", name="Saint Jude Coastal Chapel", type="church", x=85.0, y=4.5, z=70.0, width=16.0, height=14.0, depth=22.0, residents_count=45))
        b_list.append(BuildingInfo(id="HOSPITAL-01", name="Harborview Regional Emergency Hospital", type="hospital", x=10.0, y=6.0, z=-110.0, width=28.0, height=12.0, depth=22.0, residents_count=185))
        b_list.append(BuildingInfo(id="SHELTER-04", name="East Ridge Community Hall", type="community_hall", x=90.0, y=9.5, z=55.0, width=20.0, height=9.0, depth=18.0, residents_count=92))
        b_list.append(BuildingInfo(id="LIGHTHOUSE-01", name="Blackwood Lighthouse", type="lighthouse", x=-140.0, y=14.0, z=-130.0, width=10.0, height=26.0, depth=10.0, residents_count=3))

        # Houses & Commercial cottages along canal and roads
        house_coords = [
            (-110.0, 1.5, -30.0), (-120.0, 1.2, 10.0), (-95.0, 1.8, 30.0), (-80.0, 1.0, 85.0),
            (-60.0, 1.6, 95.0), (-35.0, 1.4, 42.0), (-40.0, 2.5, -20.0), (-60.0, 2.2, -90.0),
            (-90.0, 2.0, -110.0), (30.0, 3.5, 20.0), (45.0, 2.0, -50.0), (60.0, 2.8, -80.0),
            (75.0, 3.2, -25.0), (90.0, 3.8, 15.0), (110.0, 4.2, 45.0), (120.0, 4.0, -40.0),
            (100.0, 3.5, -95.0), (-20.0, 4.0, -75.0), (-45.0, 4.2, -50.0), (25.0, 5.0, -60.0),
            (50.0, 4.8, 80.0), (70.0, 4.5, 110.0), (-10.0, 2.5, 70.0), (-30.0, 2.0, 110.0),
            (-70.0, 1.3, 130.0), (-110.0, 1.1, 70.0), (130.0, 5.5, 10.0), (140.0, 6.0, 60.0),
            (40.0, 3.0, 45.0), (15.0, 3.2, 35.0), (-15.0, 2.8, 40.0), (-85.0, 1.5, -10.0)
        ]

        for idx, (hx, hy, hz) in enumerate(house_coords):
            w = 8.0 + (idx % 3) * 2.0
            h = 5.0 + (idx % 2) * 2.0
            d = 8.0 + (idx % 4) * 1.5
            is_comm = (idx % 5 == 0)
            b_list.append(BuildingInfo(
                id=f"BLD-{idx + 1:02d}",
                name=f"Coastal {'Tavern & Store' if is_comm else 'Cottage'} #{idx + 1}",
                type="commercial" if is_comm else "house",
                x=hx,
                y=hy,
                z=hz,
                width=w,
                height=h,
                depth=d,
                residents_count=(idx * 3) % 9 + 2
            ))

        return b_list

    def set_flood_level(self, level: float):
        """Sets the floodwater surface elevation (m) and recomputes shelter/building submersion."""
        self.sim_state.flood_water_level = max(0.0, min(8.0, round(level, 2)))
        self.sim_state.last_updated = datetime.now(timezone.utc).isoformat()

        # Update buildings status
        submerged_count = 0
        for b in self.buildings:
            if self.sim_state.flood_water_level >= b.y:
                b.is_flooded = True
                b.flood_depth_m = round(self.sim_state.flood_water_level - b.y, 2)
                b.status = "submerged" if b.flood_depth_m > 1.8 else "risk"
                submerged_count += 1
            else:
                b.is_flooded = False
                b.flood_depth_m = 0.0
                b.status = "normal"
        self.sim_state.total_buildings_submerged = submerged_count

        # Recalculate shelter risks & road access
        for s in self.shelters.values():
            s.local_flood_depth_m = max(0.0, round(self.sim_state.flood_water_level - s.elevation_meters, 2))
            # Cut off road if water around shelter exceeds 0.8m
            if s.local_flood_depth_m > 0.8:
                s.road_accessible = False
            else:
                s.road_accessible = True

            # Assess risk
            old_score = s.current_assessment.risk_score if s.current_assessment else 0.0
            s.current_assessment = calculate_shelter_risk(s, self.sim_state.flood_water_level)

            # Check for critical escalation (Demo Step 3!)
            if s.current_assessment.risk_score >= 80.0 and old_score < 80.0:
                self.alerts.append(AlertModel(
                    id=f"ALT-{int(time.time() * 1000) % 100000}",
                    level="critical",
                    source="shelter_engine",
                    title=f"CRITICAL RISK: {s.name}",
                    message=f"Shelter advisory risk surged to {s.current_assessment.risk_score}/100. Water level {s.local_flood_depth_m:.2f}m above threshold. Road cut off. Immediate coordinator verification required.",
                    target_id=s.id,
                    created_at=datetime.now(timezone.utc).isoformat(),
                    acknowledged=False,
                    action_required=True
                ))

    def update_simulation_tick(self, delta_time_sec: float = 1.0):
        """Simulates autonomous drone movement, battery drain, and delivery progress."""
        if not self.sim_state.is_running:
            return

        effective_delta = delta_time_sec * self.sim_state.time_scale
        self.sim_state.sim_time_sec += effective_delta

        # Update active missions and drone movement
        for m_id, mission in list(self.missions.items()):
            if mission.status == "in_progress" and mission.assigned_drone_id:
                drone = self.drones.get(mission.assigned_drone_id)
                if not drone:
                    continue

                # Progress along route
                if mission.target_location:
                    # Move drone smoothly toward next waypoint
                    dest = mission.target_location
                    dx = dest.x - drone.position.x
                    dy = dest.y - drone.position.y
                    dz = dest.z - drone.position.z
                    dist_to_target = math.sqrt(dx**2 + dy**2 + dz**2)

                    # Update mission progress %
                    step = drone.speed * effective_delta
                    if dist_to_target <= step or dist_to_target < 2.0:
                        # Arrived at target!
                        drone.position.x = dest.x
                        drone.position.y = dest.y + 4.0
                        drone.position.z = dest.z
                        mission.mission_progress = 100.0
                        drone.mission_progress = 100.0
                        mission.status = "completed"
                        mission.completed_at = datetime.now(timezone.utc).isoformat()
                        drone.status = "returning"

                        # Handle mission completion payload effect
                        if mission.type == "supply_delivery":
                            drone.current_payload_kg = 0.0
                            if mission.target_id and mission.target_id in self.requests:
                                req = self.requests[mission.target_id]
                                req.status = "delivered"
                                req.updated_at = datetime.now(timezone.utc).isoformat()
                                self.alerts.append(AlertModel(
                                    id=f"ALT-{int(time.time() * 1000) % 100000}",
                                    level="info",
                                    source="relief",
                                    title=f"Delivery Completed: {req.location_name}",
                                    message=f"{drone.name} delivered requested relief supplies (Water & Rations) to {req.location_name}.",
                                    target_id=req.id,
                                    created_at=datetime.now(timezone.utc).isoformat(),
                                    acknowledged=False,
                                    action_required=False
                                ))
                        elif mission.type == "search":
                            drone.status = "hovering"
                            # Identify PC-04 in demo
                            pc = next((p for p in self.people_clusters if p.id == "PC-04"), None)
                            if pc:
                                pc.detected_by_drone = True
                                pc.detection_confidence = 0.94
                    else:
                        # Flying toward waypoint
                        ratio = step / dist_to_target
                        drone.position.x += dx * ratio
                        drone.position.y += dy * ratio
                        drone.position.z += dz * ratio
                        drone.status = "flying"
                        progress = min(99.0, mission.mission_progress + (step / 2.0))
                        mission.mission_progress = round(progress, 1)

                    # Drain battery slightly
                    battery_loss = (step / 100.0) * 0.4
                    drone.battery = max(5.0, round(drone.battery - battery_loss, 2))
                    drone.last_telemetry_ts = datetime.now(timezone.utc).isoformat()

store = SimulationStore()
