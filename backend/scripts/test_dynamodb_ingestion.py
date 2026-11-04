"""Ingestion verification test for RESQFLY DynamoDB & IoT Core pipelines."""
import os
import sys
import time
from pathlib import Path
from decimal import Decimal

# Ensure backend path is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.aws.adapter import aws_adapter, convert_floats_to_decimals

def run_ingestion_test():
    print("=" * 65)
    print("[*] RESQFLY CLOUD INGESTION PIPELINE VERIFICATION")
    print("=" * 65)

    now_ts = int(time.time())
    status = aws_adapter.get_cloud_status()
    print(f"[*] Cloud Mode: {status.get('mode')}")
    print(f"[*] AWS Connected: {status.get('is_connected')}")
    print(f"[*] Region: {status.get('region')}")
    print(f"[*] IoT Endpoint: {status.get('iot_endpoint')}")

    # 1. Test Mission Ingestion
    print("\n[1/3] Testing Mission DynamoDB Ingestion Schema...")
    test_mission = {
        "mission_id": f"TEST-MISSION-{now_ts}",
        "timestamp": now_ts,
        "sector": "Sector 1: Coastal Canal Bridge",
        "flood_depth": 2.35,
        "victims_count": 4,
        "action": "DISPATCH_RESCUE_BOAT",
        "coordinates": {"lat": 41.3850, "lng": -70.5280},
        "status": "verified_ingestion",
        "mode": "autonomous",
        "dispatched_asset": "SCOUT-ALPHA + RESCUE-BOAT-01"
    }
    m_res = aws_adapter.sync_to_dynamodb("missions", test_mission)
    print(f"    -> Mission Sync Executed. Result: {m_res}")

    # 2. Test Telemetry Ingestion
    print("\n[2/3] Testing Telemetry DynamoDB Ingestion Schema...")
    test_telemetry = {
        "drone_id": "DRONE-01",
        "timestamp": now_ts,
        "battery": 97.4,
        "lat": 41.3862,
        "lng": -70.5271,
        "altitude": 38.5,
        "speed": 6.2,
        "status": "patrol_active",
        "drone_name": "Drone Alpha"
    }
    t_res = aws_adapter.sync_to_dynamodb("telemetry", test_telemetry)
    print(f"    -> Telemetry Sync Executed. Result: {t_res}")

    # 3. Test IoT Core MQTT Publish
    print("\n[3/3] Testing AWS IoT Core MQTT Publish...")
    topic = "resqfly/telemetry/scout-alpha"
    iot_res = aws_adapter.publish_iot_telemetry(topic, test_telemetry)
    print(f"    -> IoT Core Publish to '{topic}'. Result: {iot_res}")

    emergency_topic = "resqfly/alerts/emergency"
    alert_res = aws_adapter.publish_iot_telemetry(emergency_topic, {
        "alert": "CRITICAL_SURVIVOR_SPOTTED",
        "victims": 4,
        "sector": "Sector 1: Coastal Canal Bridge",
        "timestamp": now_ts
    })
    print(f"    -> IoT Core Publish to '{emergency_topic}'. Result: {alert_res}")

    print("\n" + "=" * 65)
    print("[*] Ingestion Verification Complete!")
    updated_status = aws_adapter.get_cloud_status()
    print(f"[*] In-Memory Audit - Telemetry: {updated_status['dynamodb_persisted']['telemetry_count']}, Missions: {updated_status['dynamodb_persisted']['missions_count']}")
    print(f"[*] IoT Messages Published: {updated_status['iot_messages_count']}")
    print("=" * 65)

if __name__ == "__main__":
    run_ingestion_test()
