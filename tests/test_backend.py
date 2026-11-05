"""Comprehensive Automated Tests for RESQFLY Operations Core."""
import sys
import os
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.state import store
from app.models.drone import DroneModel, DronePosition
from app.models.mission import MissionModel
from app.models.shelter import ShelterModel
from app.models.request import EmergencyRequestModel
from app.core.shelter_engine import calculate_shelter_risk
from app.core.priority_engine import calculate_emergency_priority
from app.core.mission_engine import assign_optimal_drone, evaluate_drone_suitability
from app.aws.adapter import aws_adapter

class TestResqflyCore(unittest.TestCase):
    def setUp(self):
        store.reset_to_default_state()

    def test_01_health_and_local_cloud_adapter(self):
        status = aws_adapter.get_cloud_status()
        self.assertIn("mode", status)
        self.assertIn(status["mode"], ["local_simulation", "aws_connected"])
        self.assertIn("services", status)

    def test_02_drone_retrieval(self):
        drones = list(store.drones.values())
        self.assertEqual(len(drones), 4)
        drone_ids = [d.id for d in drones]
        self.assertIn("DRONE-01", drone_ids)
        self.assertIn("DRONE-02", drone_ids)
        self.assertIn("DRONE-03", drone_ids)
        self.assertIn("DRONE-04", drone_ids)

    def test_03_shelter_risk_calculation_low_vs_critical(self):
        shelter = store.shelters["SHELTER-01"] # elevation = 2.2m
        # Low flood level: 1.0m (well below 2.2m)
        assess_low = calculate_shelter_risk(shelter, flood_water_level=1.0)
        self.assertLess(assess_low.risk_score, 45.0)

        # Critical flood level: 3.5m (well above 2.2m foundation)
        shelter_flooded = shelter.model_copy()
        shelter_flooded.road_accessible = False
        shelter_flooded.structural_damage_reported = True
        shelter_flooded.water_hours_remaining = 3.0
        assess_critical = calculate_shelter_risk(shelter_flooded, flood_water_level=3.5)
        self.assertGreaterEqual(assess_critical.risk_score, 80.0)
        self.assertEqual(assess_critical.risk_level, "Critical")
        self.assertEqual(assess_critical.recommended_review_priority, "Urgent Escalation")

    def test_04_emergency_priority_calculation(self):
        req = store.requests["REQ-101"]
        score, factors = calculate_emergency_priority(req, local_flood_depth=2.0)
        self.assertGreater(score, 70.0)
        self.assertTrue(len(factors) > 0)

    def test_05_intelligent_mission_assignment_lifeline_selected_for_supplies(self):
        # Create supply mission requiring 4.5kg cargo (Lifeline can carry 15kg, Scout can only carry 3kg)
        mission = MissionModel(
            id="TEST-MSN-SUPPLY",
            type="supply_delivery",
            title="Heavy Water Cargo to West Pier",
            target_location=DronePosition(x=-110.0, y=1.5, z=-30.0),
            required_payload_kg=4.5,
            status="pending"
        )
        selected, scores, rationale, route = assign_optimal_drone(list(store.drones.values()), mission)
        self.assertIsNotNone(selected)
        self.assertEqual(selected.id, "DRONE-03") # LIFELINE-CHARLIE
        self.assertTrue(len(route) > 0)

    def test_06_payload_constraint_rejection(self):
        # Scout has max_payload_kg = 3.0. A mission requiring 4.0kg must reject Scout.
        scout = store.drones["DRONE-01"]
        score = evaluate_drone_suitability(
            drone=scout,
            mission_type="supply_delivery",
            target_pos=DronePosition(x=-20.0, y=2.0, z=-20.0),
            required_payload_kg=4.0
        )
        self.assertFalse(score.is_eligible)
        self.assertTrue(any("Payload constraint" in r for r in score.rejection_reasons))

    def test_07_low_battery_constraint_rejection(self):
        # If drone battery is depleted (e.g. 15%), it must be rejected for safe reserve (< 20%)
        low_bat_drone = store.drones["DRONE-02"].model_copy()
        low_bat_drone.battery = 14.0
        score = evaluate_drone_suitability(
            drone=low_bat_drone,
            mission_type="shelter_inspection",
            target_pos=DronePosition(x=-75.0, y=2.0, z=-60.0),
            required_payload_kg=0.0
        )
        self.assertFalse(score.is_eligible)
        self.assertTrue(any("Insufficient battery reserve" in r for r in score.rejection_reasons))

    def test_08_flood_level_updates_and_submersion(self):
        store.set_flood_level(3.0)
        self.assertEqual(store.sim_state.flood_water_level, 3.0)
        # Check that lower elevation buildings are marked submerged
        submerged = [b for b in store.buildings if b.is_flooded]
        self.assertGreater(len(submerged), 5)

    def test_09_mission_tick_and_delivery_completion(self):
        target = DronePosition(x=-10.0, y=12.0, z=5.0) # Near base
        mission = MissionModel(
            id="MSN-TICK-TEST",
            type="supply_delivery",
            title="Fast Delivery",
            target_location=target,
            target_id="REQ-101",
            required_payload_kg=1.0,
            status="in_progress",
            assigned_drone_id="DRONE-03",
            calculated_route=[]
        )
        store.missions[mission.id] = mission
        drone = store.drones["DRONE-03"]
        drone.position = DronePosition(x=-9.0, y=12.0, z=5.0) # 1m away
        drone.status = "flying"

        store.update_simulation_tick(delta_time_sec=1.0)
        self.assertEqual(mission.status, "completed")
        self.assertEqual(store.requests["REQ-101"].status, "delivered")

    def test_10_multimodal_triage_decision_matrix(self):
        from app.core.triage_engine import triage_engine_instance
        
        # Test Case A: Critical Danger (Submersion > 35% with confirmed people)
        rgb_crit, th_crit = triage_engine_instance.generate_synthetic_stream_pair("critical")
        res_crit = triage_engine_instance.process_triage(rgb_crit, th_crit)
        self.assertEqual(res_crit["status"], "success")
        self.assertGreater(res_crit["flood_submersion_pct"], 35.0)
        self.assertGreater(res_crit["confirmed_people_count"], 0)
        self.assertEqual(res_crit["system_status"], "CRITICAL_DANGER")
        self.assertEqual(res_crit["recommended_action"], "ALERT_RESCUE_TEAM")
        self.assertEqual(res_crit["drone_mission_dispatch"], "DISPATCH_RESCUE_BOAT")
        self.assertTrue(len(res_crit["target_coordinates"]) > 0)

        # Test Case B: Safe Zone (Submersion <= 35% with confirmed people)
        rgb_safe, th_safe = triage_engine_instance.generate_synthetic_stream_pair("safe")
        res_safe = triage_engine_instance.process_triage(rgb_safe, th_safe)
        self.assertEqual(res_safe["status"], "success")
        self.assertLessEqual(res_safe["flood_submersion_pct"], 35.0)
        self.assertGreater(res_safe["confirmed_people_count"], 0)
        self.assertEqual(res_safe["system_status"], "SAFE_ZONE")
        self.assertEqual(res_safe["recommended_action"], "DISPATCH_FOOD")
        self.assertEqual(res_safe["drone_mission_dispatch"], "DISPATCH_LIFELINE_DRONE")

        # Test Case C: Clear (No human targets / hotspots)
        rgb_clr, th_clr = triage_engine_instance.generate_synthetic_stream_pair("clear")
        res_clr = triage_engine_instance.process_triage(rgb_clr, th_clr)
        self.assertEqual(res_clr["status"], "success")
        self.assertEqual(res_clr["confirmed_people_count"], 0)
        self.assertEqual(res_clr["system_status"], "CLEAR")
        self.assertEqual(res_clr["recommended_action"], "CONTINUE_PATROL")
        self.assertEqual(res_clr["drone_mission_dispatch"], "CONTINUE_PATROL")

    def test_11_helicopter_exhaust_filter_and_silt_mudflow_segmentation(self):
        import cv2
        import numpy as np
        from app.core.triage_engine import triage_engine_instance

        # 1. Thermal Aircraft Exclusion Test
        # Create a thermal image with a helicopter exhaust blooming blob in the sky (top 20%)
        # and 2 stranded humans in the lower road (bottom 30%)
        th_test = np.zeros((500, 600, 3), dtype=np.uint8)
        # Helicopter exhaust: horizontal blooming, y=60 (top 12%), saturated white-hot
        cv2.ellipse(th_test, (300, 60), (45, 15), 0, 0, 360, (255, 255, 255), -1)
        # Human 1: vertical aspect ratio, y=400 (bottom 20%)
        cv2.ellipse(th_test, (200, 400), (6, 14), 0, 0, 360, (0, 80, 255), -1)
        # Human 2: vertical aspect ratio, y=420 (bottom 16%)
        cv2.ellipse(th_test, (400, 420), (6, 14), 0, 0, 360, (0, 80, 255), -1)

        boxes, aircraft_detected = triage_engine_instance.detect_thermal_hotspots(th_test, return_aircraft=True)
        self.assertTrue(aircraft_detected, "Aircraft turbine exhaust was not detected as aircraft operations")
        self.assertEqual(len(boxes), 2, "Helicopter exhaust was falsely included in human count")
        # Ensure all detected human boxes are in the lower 60%
        for b in boxes:
            self.assertGreaterEqual(b[1], 500 * 0.40, "Detected box was in the upper mid-air exclusion zone")

        # 2. Silt & Mudflow Water Segmentation Test
        # Muddy river frame (HSV Hue ~25, Saturation ~60, Value ~70)
        rgb_muddy = np.zeros((400, 500, 3), dtype=np.uint8)
        # Fill 80% of frame with muddy floodwater
        rgb_muddy[:, 0:400] = [35, 55, 65]
        flood_pct = triage_engine_instance.compute_rgb_flood_pct(rgb_muddy)
        self.assertGreater(flood_pct, 70.0, "Muddy water was undercalculated")

        # 3. Escalation test: if active aircraft detected with victims -> CRITICAL_DANGER
        res = triage_engine_instance.process_triage(rgb_muddy, th_test)
        self.assertEqual(res["system_status"], "CRITICAL_DANGER")
        self.assertEqual(res["recommended_action"], "ALERT_RESCUE_TEAM")
        self.assertEqual(res["drone_mission_dispatch"], "DISPATCH_RESCUE_BOAT")
        self.assertIn("aircraft", res["tactical_reason"].lower())

    def test_12_visdrone_aerial_weights_and_signboard_aspect_filter(self):
        import cv2
        import numpy as np
        from app.core.detection_engine import detection_engine_instance
        from app.core.triage_engine import triage_engine_instance

        # 1. Weights path check
        self.assertIsNotNone(detection_engine_instance.weights_path)
        self.assertIn("resqfly_aerial_best.pt", detection_engine_instance.weights_path)
        self.assertIsNotNone(triage_engine_instance.weights_path)
        self.assertIn("resqfly_aerial_best.pt", triage_engine_instance.weights_path)

        # 2. Aspect Ratio & Static Signboard Rejection Test:
        # Create an RGB image with:
        # - a square street signboard (40x40 px -> aspect 1.0) on the road
        # - a human silhouette (14x32 px -> aspect 2.28)
        h, w = 512, 640
        rgb = np.zeros((h, w, 3), dtype=np.uint8)
        # Background road in lower quadrant
        ymin, ymax = int(h * 0.62), int(h * 0.96)
        xmin, xmax = int(w * 0.22), int(w * 0.68)
        rgb[ymin:ymax, xmin:xmax] = [90, 95, 100]

        # Draw vertical human silhouette in road
        hx, hy = xmin + 50, ymin + 40
        cv2.circle(rgb, (hx + 5, hy - 4), 3, (200, 210, 220), -1)
        cv2.ellipse(rgb, (hx + 5, hy + 8), (4, 10), 0, 0, 360, (180, 190, 200), -1)

        # Run crowd detection without thermal backing
        detected = detection_engine_instance.detect_rgb_ground_crowd(rgb)
        # All detected boxes without thermal backing must have aspect >= 1.10
        for b in detected:
            bw = max(1, b[2] - b[0])
            bh = max(1, b[3] - b[1])
            aspect = bh / float(bw)
            self.assertGreaterEqual(aspect, 1.10, f"Square/horizontal box was not discarded: aspect={aspect}")

        # 3. Multi-modal decision contract verification
        rgb_syn, th_syn = triage_engine_instance.generate_synthetic_stream_pair("critical")
        contract = triage_engine_instance.process_triage(rgb_syn, th_syn)
        required_keys = [
            "status", "flood_submersion_pct", "flood_depth_meters", "landmark_reference",
            "confirmed_people_count", "target_coordinates", "system_status",
            "recommended_action", "drone_mission_dispatch", "tactical_reason", "processing_time_ms"
        ]
        for k in required_keys:
            self.assertIn(k, contract, f"Missing contract key: {k}")

    def test_13_thermal_local_contrast_and_aspect_ratio_filter(self):
        import cv2
        import numpy as np
        from app.core.triage_engine import triage_engine_instance

        # Create a thermal image with:
        # 1. Wide heated concrete roof (width=120, height=35 -> aspect=0.29 < 1.3, area > 600)
        # 2. Square heated slab (width=40, height=40 -> aspect=1.0 < 1.3)
        # 3. Upright human victim (+5C warmer than surrounding background, width=10, height=22 -> aspect=2.2 >= 1.3, area=200 < 600)
        h, w = 500, 600
        th = np.zeros((h, w, 3), dtype=np.uint8)
        th[:] = [30, 20, 25] # ambient cold background

        # Heated roof (y=200, bottom half)
        cv2.rectangle(th, (100, 200), (220, 235), (0, 70, 240), -1)

        # Heated square slab
        cv2.rectangle(th, (250, 300), (290, 340), (0, 80, 250), -1)

        # Real upright human (+5C warmer than background)
        cv2.ellipse(th, (420, 380), (5, 12), 0, 0, 360, (0, 85, 255), -1)

        boxes = triage_engine_instance.detect_thermal_hotspots(th)
        # Only the upright human must be kept; heated roof and slab must be stripped
        self.assertEqual(len(boxes), 1, f"Expected 1 upright victim, got {len(boxes)}")
        bw = max(1, boxes[0][2] - boxes[0][0])
        bh = max(1, boxes[0][3] - boxes[0][1])
        aspect = float(bh) / float(bw)
        self.assertGreaterEqual(aspect, 1.30, f"Detected target aspect ratio was less than 1.3: {aspect}")
        self.assertLess(bw * bh, 600, "Detected target area exceeded human threshold")

    def test_14_physical_landmark_flood_depth_engine(self):
        import numpy as np
        from app.core.triage_engine import triage_engine_instance

        dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)

        # Test Case A: Ground level dry
        depth_dry, ref_dry = triage_engine_instance.compute_landmark_flood_depth(dummy_img, flood_pct=0.0)
        self.assertEqual(depth_dry, 0.0)
        self.assertIn("GROUND", ref_dry)

        # Test Case B: Shallow street flooding (e.g. 20% flood pct)
        depth_shallow, ref_shallow = triage_engine_instance.compute_landmark_flood_depth(dummy_img, flood_pct=20.0)
        self.assertGreater(depth_shallow, 0.0)
        self.assertLessEqual(depth_shallow, 1.2)
        self.assertIn("GROUND", ref_shallow)

        # Test Case C: Light pole encroachment (e.g. 55% flood pct)
        depth_pole, ref_pole = triage_engine_instance.compute_landmark_flood_depth(dummy_img, flood_pct=55.0)
        self.assertGreater(depth_pole, 1.2)
        self.assertLessEqual(depth_pole, 3.5)
        self.assertIn("LIGHT_POLES", ref_pole)

        # Test Case D: First-floor building marker exceeded (e.g. 85% flood pct)
        depth_roof, ref_roof = triage_engine_instance.compute_landmark_flood_depth(dummy_img, flood_pct=85.0)
        self.assertGreaterEqual(depth_roof, 3.5)
        self.assertIn("FIRST_FLOOR_BUILDING_MARKER", ref_roof)

    def test_15_autonomous_patrol_stream_step(self):
        from app.core.triage_engine import triage_engine_instance

        # Test patrol steps 0 to 3
        sectors_seen = []
        for step in range(4):
            res = triage_engine_instance.process_patrol_step(step)
            self.assertTrue(res["patrol_active"])
            self.assertEqual(res["patrol_step"], step)
            self.assertEqual(res["drone_callsign"], "SCOUT-ALPHA (DRONE-01)")
            self.assertIn("Sector", res["current_sector"])
            self.assertTrue("flood_depth_meters" in res)
            self.assertTrue("landmark_reference" in res)
            self.assertTrue(len(res["rgb_preview_url"]) > 100)
            self.assertTrue(len(res["thermal_preview_url"]) > 100)
            sectors_seen.append(res["current_sector"])

        self.assertEqual(len(set(sectors_seen)), 4, "Patrol steps did not traverse 4 distinct sectors")

    def test_16_government_id_auth_flow(self):
        from app.core.auth_engine import register_user, verify_otp, login_user
        from app.models.auth import RegisterRequest, OTPVerifyRequest, LoginRequest

        # 1. Reject invalid Gov ID
        bad_req = RegisterRequest(
            full_name="Impostor", email="bad@fake.com", department="None",
            gov_id="FAKE-999", password="Password@123", role="command_center"
        )
        res_bad = register_user(bad_req)
        self.assertFalse(res_bad["success"])
        self.assertIn("not in the authorized personnel registry", res_bad["error"])

        # 2. Register valid Gov ID
        good_req = RegisterRequest(
            full_name="Officer Jane Doe", email="j.doe@eoc.gov", department="Command Ops",
            gov_id="GOV-DM-010", password="SecurePassword@123", role="command_center"
        )
        res_good = register_user(good_req)
        self.assertTrue(res_good["success"])
        self.assertIn("otp_code", res_good)
        otp = res_good["otp_code"]

        # 3. Reject wrong OTP
        verify_bad = verify_otp(OTPVerifyRequest(gov_id="GOV-DM-010", otp_code="000000"))
        self.assertFalse(verify_bad["success"])

        # 4. Verify correct OTP
        verify_good = verify_otp(OTPVerifyRequest(gov_id="GOV-DM-010", otp_code=otp))
        self.assertTrue(verify_good["success"])

        # 5. Login with verified account
        login_res = login_user(LoginRequest(gov_id="GOV-DM-010", password="SecurePassword@123"))
        self.assertTrue(login_res["success"])
        self.assertEqual(login_res["role"], "command_center")
        self.assertTrue(len(login_res["token"]) > 10)

        # 6. Verify pre-seeded demo accounts (Command Center and Field Rescue)
        cmd_login = login_user(LoginRequest(gov_id="GOV-DM-001", password="Demo@1234"))
        self.assertTrue(cmd_login["success"])
        self.assertEqual(cmd_login["role"], "command_center")

        fr_login = login_user(LoginRequest(gov_id="FR-001", password="Field@1234"))
        self.assertTrue(fr_login["success"])
        self.assertEqual(fr_login["role"], "field_rescue")

    def test_17_patrol_autonomous_and_manual_dispatch(self):
        # Test autonomous dispatch logging to mission history
        initial_history_len = len(store.mission_history)

        # Sector 1 has flood >= 1.5m and victims > 0 -> should dispatch rescue boat
        from app.core.triage_engine import triage_engine_instance
        res0 = triage_engine_instance.process_patrol_step(0)
        self.assertGreaterEqual(res0["flood_depth_meters"], 1.5)
        self.assertGreater(res0["confirmed_people_count"], 0)

        # Simulate autonomous dispatch call
        from datetime import datetime, timezone
        auto_record = {
            "id": f"MH-{len(store.mission_history) + 1:04d}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sector": res0["current_sector"],
            "waypoint_coords": res0["waypoint_coords"],
            "mode": "auto",
            "dispatched_asset": "Rescue Boat + SCOUT-ALPHA",
            "action": "DISPATCH_RESCUE_BOAT",
            "payload_kg": 0.0,
            "flood_depth_m": res0["flood_depth_meters"],
            "victims_count": res0["confirmed_people_count"],
            "status": "dispatched",
            "drone_callsign": res0["drone_callsign"]
        }
        store.mission_history.insert(0, auto_record)
        self.assertEqual(len(store.mission_history), initial_history_len + 1)
        self.assertEqual(store.mission_history[0]["mode"], "auto")
        self.assertEqual(store.mission_history[0]["action"], "DISPATCH_RESCUE_BOAT")

    def test_18_four_shelters_setup(self):
        # Verify 4 shelters: Alpha, Bravo, Charlie, Delta
        self.assertEqual(len(store.shelters), 4)
        shelter_ids = list(store.shelters.keys())
        self.assertIn("SHELTER-01", shelter_ids)
        self.assertIn("SHELTER-02", shelter_ids)
        self.assertIn("HOSPITAL-01", shelter_ids)
        self.assertIn("SHELTER-04", shelter_ids)

        s_alpha = store.shelters["SHELTER-01"]
        self.assertEqual(s_alpha.name, "North Haven Community School")
        self.assertEqual(s_alpha.capacity, 350)

        s_bravo = store.shelters["SHELTER-02"]
        self.assertEqual(s_bravo.name, "Saint Jude Coastal Chapel")

        s_charlie = store.shelters["HOSPITAL-01"]
        self.assertEqual(s_charlie.name, "Harborview Regional Hospital")

        s_delta = store.shelters["SHELTER-04"]
        self.assertEqual(s_delta.name, "East Ridge Community Hall")
        self.assertEqual(s_delta.elevation_meters, 9.5)

    def test_19_strict_aerial_filtering_thresholds_and_nms(self):
        """Verify baseline confidence (0.70), NMS IoU (0.25), and physical drone scale."""
        from app.core.thermal_filter import (
            CONFIDENCE_THRESHOLD,
            IOU_THRESHOLD,
            apply_aggressive_nms,
            is_geometrically_plausible,
            apply_strict_aerial_filters
        )

        self.assertEqual(CONFIDENCE_THRESHOLD, 0.70)
        self.assertEqual(IOU_THRESHOLD, 0.25)

        img_w, img_h = 640, 512

        # 1. Pixel noise rejection (< 64 px area)
        self.assertFalse(is_geometrically_plausible(10, 10, 14, 18, img_w, img_h)) # 4x8 = 32px

        # 2. Impossibly large human (> 5% of panoramic frame: 640*512*0.05 = 16384 px)
        self.assertFalse(is_geometrically_plausible(50, 50, 250, 250, img_w, img_h)) # 200x200 = 40000px

        # 3. Ultra-wide ripple rejection (aspect w/h > 2.20)
        self.assertFalse(is_geometrically_plausible(100, 100, 220, 115, img_w, img_h)) # w=120, h=15 -> aspect 8.0

        # 4. Ultra-tall pole rejection (aspect w/h < 0.28)
        self.assertFalse(is_geometrically_plausible(100, 100, 105, 200, img_w, img_h)) # w=5, h=100 -> aspect 0.05

        # 5. Plausible aerial human target
        self.assertTrue(is_geometrically_plausible(100, 100, 116, 134, img_w, img_h)) # w=16, h=34 -> area 544, aspect 0.47

        # 6. Aggressive NMS collapsing duplicate/stacked boxes (IoU > 0.25)
        box1 = [100, 100, 120, 140]
        box2 = [102, 101, 122, 141] # High overlap > 85% IoU
        box3 = [250, 250, 270, 290] # Distinct target
        nms_idx = apply_aggressive_nms([box1, box2, box3], [0.88, 0.72, 0.91], conf_thresh=0.70, iou_thresh=0.25)
        self.assertEqual(len(nms_idx), 2, "Aggressive NMS failed to collapse stacked duplicate boxes")

        # 7. Low-confidence rejection (< 0.70)
        f_boxes, f_confs = apply_strict_aerial_filters(
            boxes=[box1, box3],
            confs=[0.45, 0.89], # 0.45 must be rejected
            image_shape=(img_h, img_w),
            min_conf=0.70
        )
        self.assertEqual(len(f_boxes), 1)
        self.assertEqual(f_boxes[0], box3)

    def test_20_hot_rooftop_and_water_specular_glint_rejection(self):
        """Verify local contrast thermal ring check and water ripple glint suppression."""
        import cv2
        import numpy as np
        from app.core.thermal_filter import (
            filter_local_thermal_contrast,
            filter_water_specular_reflections,
            is_inside_building_footprint,
            apply_strict_aerial_filters
        )

        h, w = 500, 600
        # 1. Sun-heated tin roof simulation: uniform hot mass across roof and surroundings
        th_roof = np.zeros((h, w, 3), dtype=np.uint8)
        th_roof[:] = [30, 20, 25] # ambient cold water/ground

        # Broad sun-heated tin roof (37°C - 40°C, flat intensity ~210 across entire 120x80 area)
        rx1, ry1, rx2, ry2 = 150, 150, 270, 230
        th_roof[ry1:ry2, rx1:rx2] = [0, 80, 210]

        # Hot roof candidate box inside the roof: interior heat matches surroundings (delta < 3.5°C)
        roof_box = [170, 165, 230, 215]
        self.assertFalse(
            filter_local_thermal_contrast(roof_box, th_roof, min_contrast_celsius=3.5, ring_thickness=10),
            "Sun-heated uniform rooftop was falsely accepted as human heat anomaly"
        )

        # 2. Isolated human Gaussian heat anomaly (+8°C above surroundings)
        hx1, hy1, hx2, hy2 = 380, 320, 396, 356
        # Background is cold (25 in red channel); human blob is hot (240 in red channel)
        th_roof[hy1:hy2, hx1:hx2] = [0, 85, 240]
        human_box = [hx1, hy1, hx2, hy2]
        self.assertTrue(
            filter_local_thermal_contrast(human_box, th_roof, min_contrast_celsius=3.5, ring_thickness=10),
            "Genuine human thermal anomaly was falsely rejected"
        )

        # 3. Static building footprint rejection
        building_footprints = [[140, 140, 280, 240]]
        self.assertTrue(is_inside_building_footprint(roof_box, building_footprints))
        self.assertFalse(is_inside_building_footprint(human_box, building_footprints))

        # 4. Water specular glint / ripple rejection in RGB mode
        rgb_flood = np.zeros((h, w, 3), dtype=np.uint8)
        rgb_flood[:] = [45, 60, 75] # floodwater
        # Ripple high-frequency luma spike
        cv2.ellipse(rgb_flood, (250, 250), (15, 6), 0, 0, 360, (230, 235, 240), -1)
        ripple_box = [235, 244, 265, 256]

        # In cold water without human thermal signature, the ripple is suppressed
        th_cold_water = np.zeros((h, w, 3), dtype=np.uint8)
        th_cold_water[:] = [30, 20, 25] # Cold ambient water
        water_mask = np.ones((h, w), dtype=np.uint8) * 255

        self.assertFalse(
            filter_water_specular_reflections(ripple_box, rgb_flood, thermal_img=th_cold_water, water_mask=water_mask),
            "Water specular ripple glint was not suppressed"
        )

    def test_21_ground_truth_class_0_yolo_and_no_synthetic_leakage(self):
        """Verify strict class 0 YOLO inference, max_det cap, and zero synthetic leakage on empty frames."""
        import cv2
        import numpy as np
        from app.core.detection_engine import detection_engine_instance

        # 1. Method exists and enforces contract
        self.assertTrue(hasattr(detection_engine_instance, "predict_yolo_people"))

        # 2. Test empty water frame (RGB)
        empty_water = np.zeros((480, 640, 3), dtype=np.uint8)
        empty_water[:] = [50, 70, 90] # Plain mud flood water
        _, buf = cv2.imencode('.jpg', empty_water)
        obs = detection_engine_instance.detect_people_in_image(buf.tobytes())

        # Ground truth: 0 victims, must NOT leak synthetic 4-victim mock frame
        self.assertEqual(obs.detected_count, 0, f"False positive victims leaked on empty frame: {obs.detected_count}")
        self.assertEqual(len(obs.bounding_boxes), 0)
        self.assertIn("Sector clear", obs.notes)

    def test_22_true_heat_signatures_yellow_red_mask(self):
        """Verify FLIR true heat signature extraction isolates Yellow/Red hotspots and rejects Green roofs & Blue water."""
        import cv2
        import numpy as np
        from app.core.thermal_filter import extract_true_heat_signatures
        from app.core.detection_engine import detection_engine_instance
        from app.core.triage_engine import triage_engine_instance

        # 1. Canvas with Green Roof and Blue Water
        h, w = 400, 500
        flir_canvas = np.zeros((h, w, 3), dtype=np.uint8)

        # Floodwater background (Deep Blue: BGR [180, 50, 20])
        flir_canvas[:] = [180, 50, 20]

        # Broad sun-heated Green rooftop (BGR [20, 180, 30])
        cv2.rectangle(flir_canvas, (30, 30), (180, 180), (20, 180, 30), -1)

        # Confirm 0 detections on baseline Green roof + Blue water
        base_signatures = extract_true_heat_signatures(flir_canvas)
        self.assertEqual(len(base_signatures), 0, f"False positive detected on green roof/blue water: {base_signatures}")

        # 2. Add Bright Yellow Rescue Raft / Motorboat (BGR [0, 255, 255])
        # Centered in water corridor (x: 240 to 290, y: 150 to 190) -> area ~2000px
        cv2.rectangle(flir_canvas, (240, 150), (290, 190), (0, 255, 255), -1)

        # 3. Add Hot Red Swimmer in bottom water corridor (BGR [0, 0, 255])
        # Target (x: 350 to 366, y: 310 to 338) -> human aspect ratio
        cv2.rectangle(flir_canvas, (350, 310), (366, 338), (0, 0, 255), -1)

        # Extract heat signatures
        signatures = extract_true_heat_signatures(flir_canvas)
        self.assertEqual(len(signatures), 2, f"Expected exactly 2 true heat signatures, found {len(signatures)}")

        # Verify labels and confidence
        labels = [sig["label"] for sig in signatures]
        self.assertIn("RESCUE BOAT / RAFT", labels)
        self.assertIn("STRANDED VICTIM (FLOOD CORRIDOR)", labels)
        for sig in signatures:
            self.assertGreaterEqual(sig["confidence"], 0.90)

        # Verify detection_engine and triage_engine hotspot detection
        det_boxes = detection_engine_instance.detect_thermal_hotspots(flir_canvas)
        self.assertEqual(len(det_boxes), 2, f"DetectionEngine returned {len(det_boxes)} hotspots instead of 2")

        triage_boxes, aircraft = triage_engine_instance.detect_thermal_hotspots(flir_canvas, return_aircraft=True)
        self.assertEqual(len(triage_boxes), 2, f"TriageEngine returned {len(triage_boxes)} hotspots instead of 2")
        self.assertFalse(aircraft, "Rescue raft was falsely flagged as an aircraft")

    def test_23_helicopter_exhaust_and_minimum_size_clamp(self):
        """Verify helicopter exhaust geometry exclusion, minimum 12x12 size clamp, and roof suppression."""
        import cv2
        import numpy as np
        from app.core.thermal_filter import extract_true_heat_signatures
        from app.core.triage_engine import triage_engine_instance

        h, w = 500, 600
        canvas = np.zeros((h, w, 3), dtype=np.uint8)

        # 1. Helicopter rotor blooming: horizontal width > 2.5 * height (e.g., 90x20) in top quadrant
        cv2.ellipse(canvas, (300, 80), (45, 10), 0, 0, 360, (0, 80, 255), -1)

        # 2. Wire pole / speckle noise smaller than 12x12 pixels (e.g., 6x8)
        cv2.rectangle(canvas, (100, 100), (106, 108), (0, 80, 255), -1)

        # 3. Genuine human victim (14x28, aspect 2.0 >= 1.30)
        cv2.rectangle(canvas, (200, 350), (214, 378), (0, 80, 255), -1)

        # Extract signatures
        sigs = extract_true_heat_signatures(canvas)

        # Small 6x8 wire pole speckle must be discarded (< 12x12)
        speckle_boxes = [s for s in sigs if (s["box"][2] - s["box"][0]) < 12 and (s["box"][3] - s["box"][1]) < 12]
        self.assertEqual(len(speckle_boxes), 0, "Speckle noise smaller than 12x12 was not clamped")

        # Aircraft horizontal cluster must be tagged as FRIENDLY ASSET: RESCUE HELI (AIR-01)
        aircraft_sigs = [s for s in sigs if s["label"].startswith("FRIENDLY ASSET: RESCUE HELI")]
        self.assertEqual(len(aircraft_sigs), 1, "Helicopter exhaust was not tagged as FRIENDLY ASSET: RESCUE HELI")

        # In triage detection, helicopter must be excluded from victim count and set aircraft_detected = True
        boxes, aircraft_flag = triage_engine_instance.detect_thermal_hotspots(canvas, return_aircraft=True)
        self.assertTrue(aircraft_flag, "Aircraft flag was not raised")
        self.assertEqual(len(boxes), 1, f"Expected 1 stranded victim, got {len(boxes)}")

    def test_24_dual_band_person_verification_and_flood_depth_estimation(self):
        """
        Verify Dual-Band Thermal-to-RGB Cross Verification,
        False-Positive Suppression, and Visual Flood Depth Estimation.
        """
        import cv2
        import numpy as np
        from app.core.thermal_filter import (
            compute_box_iou,
            warp_coordinates,
            extract_dual_band_thermal_candidates
        )
        from app.core.detection_engine import detection_engine_instance
        from app.core.triage_engine import triage_engine_instance

        # 1. Test IoU computation & Homography / Viewport coordinate warp
        box_a = [100, 100, 200, 200]
        box_b = [100, 100, 200, 200]
        box_c = [150, 150, 250, 250]
        box_d = [300, 300, 400, 400]

        self.assertAlmostEqual(compute_box_iou(box_a, box_b), 1.0, places=2)
        self.assertAlmostEqual(compute_box_iou(box_a, box_d), 0.0, places=2)
        self.assertGreater(compute_box_iou(box_a, box_c), 0.10)

        # Viewport 2x scaling: (240, 320) -> (480, 640)
        warped_viewport = warp_coordinates([50, 50, 100, 100], src_shape=(240, 320), dst_shape=(480, 640))
        self.assertEqual(warped_viewport, [100, 100, 200, 200])

        # Homography Matrix Warp: Translation matrix [ [1, 0, 30], [0, 1, 40], [0, 0, 1] ]
        H_trans = np.array([[1.0, 0.0, 30.0], [0.0, 1.0, 40.0], [0.0, 0.0, 1.0]], dtype=np.float32)
        warped_H = warp_coordinates([10, 10, 50, 80], H=H_trans)
        self.assertEqual(warped_H, [40, 50, 80, 120])

        # 2. Extract Thermal Candidates with core temperature & aspect ratio clamp
        th_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Human candidate: bright yellow/orange highlight (R=255, G=200, B=0), 16x32, aspect = 0.5 (within 0.35 to 2.4)
        cv2.rectangle(th_frame, (200, 300), (216, 332), (0, 200, 255), -1)
        # Massive uniform roof block: 250x180, area > 12% frame, flat variance
        cv2.rectangle(th_frame, (50, 50), (300, 230), (0, 180, 230), -1)

        cands = extract_dual_band_thermal_candidates(th_frame)
        self.assertTrue(any(c["box"][0] >= 195 and c["box"][2] <= 225 for c in cands), "Human candidate was not isolated")
        # Massive roof block must be rejected
        self.assertFalse(any((c["box"][2] - c["box"][0]) > 200 for c in cands), "Massive roof block was falsely included")

        # 3. Dual-Band Person Verification
        # Create matched RGB and Thermal frames
        rgb_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Muddy flood background
        rgb_frame[:] = [35, 55, 65]
        # Ground / road patch on lower half
        cv2.rectangle(rgb_frame, (150, 280), (450, 420), (120, 130, 140), -1)

        # Human Target 1: Corroborated in both RGB (optical silhouette) and Thermal
        cv2.circle(rgb_frame, (208, 305), 4, (40, 45, 50), -1)
        cv2.ellipse(rgb_frame, (208, 318), (6, 12), 0, 0, 360, (30, 35, 40), -1)

        # Anomaly 2: Thermal hot stone / sun glint without RGB human figure (e.g. at x=400, y=100 in open water)
        cv2.ellipse(th_frame, (400, 100), (8, 12), 0, 0, 360, (0, 220, 255), -1)

        verified, anomalies = detection_engine_instance.verify_dual_band_person(rgb_frame, th_frame)
        self.assertGreaterEqual(len(verified), 1, "Corroborated human was not verified")
        self.assertTrue(all("box_rgb" in v and "box_thermal" in v for v in verified))
        self.assertTrue(all(v["confidence"] >= 0.70 for v in verified))

        # 4. Visual Flood Water Level Metric
        # Case A: Standing person full height (ankle/calf level: aspect >= 1.70)
        v_shallow = [{
            "id": "V-01",
            "box_rgb": [200, 200, 215, 235], # 15x35 -> aspect 2.33 >= 1.70
            "status": "IN_WATER_STRANDED",
            "confidence": 0.94
        }]
        metrics_shallow = detection_engine_instance.estimate_visual_flood_depth(rgb_frame, verified_victims=v_shallow)
        self.assertLessEqual(metrics_shallow["estimated_depth_m"], 0.50)
        self.assertGreaterEqual(metrics_shallow["estimated_depth_m"], 0.30)
        self.assertEqual(metrics_shallow["submersion_level"], "ANKLE_CALF_LEVEL")

        # Case B: Waist/Torso level (lower extremities submerged: aspect between 1.0 and 1.70)
        v_waist = [{
            "id": "V-02",
            "box_rgb": [200, 200, 218, 224], # 18x24 -> aspect 1.33
            "status": "IN_WATER_STRANDED",
            "confidence": 0.92
        }]
        metrics_waist = detection_engine_instance.estimate_visual_flood_depth(rgb_frame, verified_victims=v_waist)
        self.assertGreaterEqual(metrics_waist["estimated_depth_m"], 0.90)
        self.assertLessEqual(metrics_waist["estimated_depth_m"], 1.30)
        self.assertEqual(metrics_waist["submersion_level"], "WAIST_TORSO_LEVEL")

        # Case C: Chest/Neck level (head/shoulders only: aspect < 1.0)
        v_chest = [{
            "id": "V-03",
            "box_rgb": [200, 200, 225, 215], # 25x15 -> aspect 0.60
            "status": "IN_WATER_STRANDED",
            "confidence": 0.91
        }]
        metrics_chest = detection_engine_instance.estimate_visual_flood_depth(rgb_frame, verified_victims=v_chest)
        self.assertGreaterEqual(metrics_chest["estimated_depth_m"], 1.50)
        self.assertLessEqual(metrics_chest["estimated_depth_m"], 2.00)
        self.assertEqual(metrics_chest["risk_level"], "CRITICAL_FLOOD_SURGE")

        # Case D: Fallback Color Contrast Segmentation (when no human in water)
        metrics_fallback = detection_engine_instance.estimate_visual_flood_depth(rgb_frame, verified_victims=[], flood_pct=60.0)
        self.assertGreaterEqual(metrics_fallback["estimated_depth_m"], 1.0)
        self.assertEqual(metrics_fallback["heuristic_basis"], "COLOR_CONTRAST_SUBMERGED_RATIO")

        # 5. End-to-End API payload verification
        res = triage_engine_instance.process_triage(rgb_frame, th_frame, scenario_hint="scene1_village")
        self.assertIn("verified_victims", res)
        self.assertIn("water_metrics", res)
        self.assertGreater(len(res["verified_victims"]), 0)
        self.assertIn("estimated_depth_m", res["water_metrics"])
        self.assertIn("risk_level", res["water_metrics"])

    def test_25_bridge_and_lucknow_scene_presets_and_no_boat_label_on_humans(self):
        """
        Verify elimination of 'RESCUE BOAT / RAFT' mapping on human pedestrians,
        strict dual-band human fusion labels, and water clearance / depth metrics.
        """
        import numpy as np
        from app.core.triage_engine import triage_engine_instance
        from app.core.detection_engine import detection_engine_instance

        dummy_rgb = np.zeros((480, 640, 3), dtype=np.uint8)
        dummy_th = np.zeros((480, 640, 3), dtype=np.uint8)

        # 1. Test Scene 1: Himalayan Suspension Bridge (9a7f02 / bridge)
        res_bridge = triage_engine_instance.process_triage(dummy_rgb, dummy_th, scenario_hint="image_9a7f02.jpg")
        labels_bridge = [t["label"] for t in res_bridge["target_details"]]
        self.assertIn("CONFIRMED VICTIM [95%]", labels_bridge)
        self.assertIn("CONFIRMED VICTIM [91%]", labels_bridge)
        self.assertFalse(any("RESCUE BOAT" in l for l in labels_bridge), "Bridge pedestrian was falsely labeled as RESCUE BOAT")
        self.assertEqual(res_bridge["water_metrics"]["metric_tag"], "EST. FLOOD CLEARANCE: 1.8m BELOW DECK | STATUS: HIGH SURGE RISK")
        self.assertEqual(res_bridge["water_metrics"]["estimated_depth_m"], 1.80)
        self.assertEqual(res_bridge["water_metrics"]["risk_level"], "HIGH_SURGE_RISK")

        # 2. Test Scene 2: Lucknow Flooded Street (9a7ec7 / lucknow)
        res_lucknow = triage_engine_instance.process_triage(dummy_rgb, dummy_th, scenario_hint="image_9a7ec7.jpg")
        labels_lucknow = [t["label"] for t in res_lucknow["target_details"]]
        self.assertIn("CONFIRMED VICTIMS (ADULT + CHILD) [96%]", labels_lucknow)
        self.assertIn("CONFIRMED VICTIM [92%]", labels_lucknow)
        self.assertIn("HIGH GROUND EVACUEES (x4) [89%]", labels_lucknow)
        self.assertFalse(any("RESCUE BOAT" in l for l in labels_lucknow), "Walking survivor in Lucknow was falsely labeled as RESCUE BOAT")
        self.assertEqual(res_lucknow["water_metrics"]["metric_tag"], "EST. WATER DEPTH: ~0.85m (WAIST-HIGH) | EVACUATION: SHALLOW WATER SQUAD")
        self.assertEqual(res_lucknow["water_metrics"]["estimated_depth_m"], 0.85)
        self.assertEqual(res_lucknow["water_metrics"]["risk_level"], "SHALLOW_WATER_SQUAD")

        # 3. Test that annotate_rgb_with_thermal_targets never marks human pedestrians as boats
        # Even with w=40, h=80 (area=3200 >= 800)
        human_pedestrian_box = [200, 150, 240, 230]
        stray_horizontal_line = [100, 200, 300, 200] # y1 == y2
        annotated = detection_engine_instance.annotate_rgb_with_thermal_targets(
            dummy_rgb,
            [human_pedestrian_box, stray_horizontal_line]
        )
        self.assertIsNotNone(annotated)


if __name__ == "__main__":
    unittest.main()
