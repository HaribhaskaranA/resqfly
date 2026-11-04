"""RESQFLY Unified Application Launcher."""
import uvicorn
import sys
import os

if __name__ == "__main__":
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    print("=" * 60)
    print("[*] RESQFLY - Intelligent Multi-Drone Disaster Rescue & Relief System")
    print("[*] Scenario: North Haven Coastal Flood (Halloween Night)")
    print("[*] Starting Unified Server at http://localhost:8000")
    print("=" * 60)

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
