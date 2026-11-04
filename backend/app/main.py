"""FastAPI Application Entry Point for RESQFLY."""
import asyncio
import json
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.core.state import store
from app.aws.adapter import aws_adapter
from app.routers.disasters import health_router, disasters_router
from app.routers.drones import drones_router
from app.routers.missions import missions_router
from app.routers.shelters import shelters_router
from app.routers.requests import requests_router
from app.routers.detection import detection_router
from app.routers.alerts import alerts_router
from app.routers.simulation import simulation_router
from app.routers.analytics import analytics_router
from app.routers.auth import auth_router

# Background ticker for autonomous simulation
async def simulation_ticker():
    tick_count = 0
    while True:
        try:
            store.update_simulation_tick(1.0)
            tick_count += 1
            # Periodically sync drone fleet telemetry to DynamoDB resqfly_telemetry & AWS IoT Core
            if tick_count % 5 == 0:
                now_ts = int(time.time())
                for d_id, drone in list(store.drones.items()):
                    # Exact schema keys: drone_id (S), timestamp (N), battery (N), lat (N), lng (N), altitude (N)
                    lat_coord = round(41.3850 + float(drone.position.x) * 0.00008, 6)
                    lng_coord = round(-70.5280 + float(drone.position.z) * 0.00008, 6)

                    telemetry_payload = {
                        "drone_id": str(drone.id),
                        "timestamp": now_ts,
                        "battery": float(drone.battery),
                        "lat": lat_coord,
                        "lng": lng_coord,
                        "altitude": float(drone.altitude),
                        "speed": float(drone.speed),
                        "status": str(drone.status),
                        "drone_name": str(drone.name),
                    }
                    aws_adapter.sync_to_dynamodb("telemetry", telemetry_payload)

                    # Publish to AWS IoT Core MQTT Topic: resqfly/telemetry/scout-alpha or resqfly/telemetry/{drone_id}
                    topic_suffix = "scout-alpha" if drone.id == "DRONE-01" else "lifeline-charlie" if drone.id == "DRONE-03" else drone.id.lower()
                    aws_adapter.publish_iot_telemetry(f"resqfly/telemetry/{topic_suffix}", telemetry_payload)
            await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(simulation_ticker())
    yield
    task.cancel()

app = FastAPI(
    title="RESQFLY Operations Core",
    description="Intelligent Multi-Drone Disaster Rescue & Relief System API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure Production CORS for Vercel Frontend, Render Cloud, and Local Development
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "https://resqfly.vercel.app",
    "https://resqfly.onrender.com",
]

# Allow all Vercel deployments (*.vercel.app), Render cloud hosts, and local network ports
CORS_ORIGIN_REGEX = r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*|http://127\.0\.0\.1:.*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

# Mount REST API Routers
app.include_router(health_router, prefix="/api")
app.include_router(disasters_router, prefix="/api")
app.include_router(drones_router, prefix="/api")
app.include_router(missions_router, prefix="/api")
app.include_router(shelters_router, prefix="/api")
app.include_router(requests_router, prefix="/api")
app.include_router(detection_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/api/cloud/status")
def get_cloud_status():
    return aws_adapter.get_cloud_status()

@app.get("/api/aws/status")
def get_aws_status():
    """Exposes real-time connection status for DynamoDB and AWS IoT Core MQTT."""
    return {
        "status": "connected" if aws_adapter.is_connected else "simulated",
        "dynamodb": {
            "status": "connected" if aws_adapter.is_connected else "simulated",
            "region": aws_adapter.region,
            "tables": ["resqfly_missions", "resqfly_telemetry", "resqfly_users"],
            "telemetry_synced": len(aws_adapter.local_dynamodb_records.get("telemetry", [])),
            "missions_synced": len(aws_adapter.local_dynamodb_records.get("missions", []))
        },
        "iot_core": {
            "status": "connected" if aws_adapter.is_connected else "simulated",
            "protocol": "MQTT/HTTPS (QoS 1)",
            "endpoint": aws_adapter.iot_endpoint or f"data.iot.{aws_adapter.region}.amazonaws.com",
            "topics": [
                "resqfly/telemetry/scout-alpha",
                "resqfly/telemetry/lifeline-charlie",
                "resqfly/alerts/emergency"
            ],
            "messages_published": aws_adapter.cloud_events_dispatched
        },
        "account_id": aws_adapter.account_id or "312469489912",
        "last_sync": aws_adapter.last_sync_timestamp or datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/ai/incident-brief")
def get_incident_brief(payload: dict = None):
    prompt = payload.get("prompt", "Summarize current coastal village flood state and drone deployments.") if payload else "Summarize flood situation."
    brief = aws_adapter.generate_incident_summary_bedrock(prompt)
    return {
        "brief": brief,
        "mode": "aws_bedrock" if aws_adapter.is_connected else "deterministic_engine_fallback",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

# WebSocket for Real-Time Telemetry & State Push
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            state_payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "flood_water_level": store.sim_state.flood_water_level,
                "is_running": store.sim_state.is_running,
                "drones": [d.model_dump() for d in store.drones.values()],
                "active_missions": [m.model_dump() for m in store.missions.values() if m.status == "in_progress"],
                "alerts_count": len([a for a in store.alerts if not a.acknowledged]),
                "critical_alerts": [a.model_dump() for a in store.alerts if a.level == "critical" and not a.acknowledged],
                "cloud_mode": "aws_connected" if aws_adapter.is_connected else "local_simulation"
            }
            await websocket.send_text(json.dumps(state_payload))
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

import os
from fastapi.staticfiles import StaticFiles

dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")

