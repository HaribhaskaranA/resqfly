"""Alerts & Notifications API for RESQFLY."""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.models.alert import AlertModel
from app.core.state import store

alerts_router = APIRouter(prefix="/alerts", tags=["Alerts"])

@alerts_router.get("", response_model=List[AlertModel])
def list_alerts():
    return store.alerts

@alerts_router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, payload: Dict[str, Any] = None):
    alert = next((a for a in store.alerts if a.id == alert_id.upper()), None)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

    alert.acknowledged = True
    alert.acknowledged_by = payload.get("acknowledged_by", "Rescue Coordinator") if payload else "Rescue Coordinator"
    alert.acknowledged_at = datetime.now(timezone.utc).isoformat()

    return {"status": "acknowledged", "alert": alert}
