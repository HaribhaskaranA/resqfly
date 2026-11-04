# Deployment Guide — RESQFLY

This guide provides instructions for deploying RESQFLY locally and to cloud container environments (AWS ECS / Fargate or EC2).

---

## 1. Quick Local Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ (bundled or installed)
- Pip

### Single-Command Launch
```powershell
# Navigate to project root
cd C:\Users\HARIBHASKARAN A\.gemini\antigravity\scratch\resqfly

# Run unified server
python run_resqfly.py
```
Open your browser to:
👉 **`http://localhost:8000`**

The unified server serves:
- React + Vite + Tailwind + Three.js frontend at root `/`
- FastAPI REST APIs at `/api/*`
- Live telemetry WebSockets at `/ws/telemetry`
- Interactive OpenAPI documentation at `/docs`

---

## 2. Development Mode (Hot-Reload)

To run frontend and backend with hot-reload during active development:

**Terminal 1 — Backend:**
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```
Access frontend at `http://localhost:3000` (automatically proxies API requests to port 8000).

---

## 3. Docker Deployment (AWS ECS / EC2)

A production container bundles the compiled React frontend into the FastAPI server.

### Dockerfile
```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY run_resqfly.py .

EXPOSE 8000
CMD ["python", "run_resqfly.py"]
```

### Build & Run Container
```bash
docker build -t resqfly:latest .
docker run -p 8000:8000 -e RESQFLY_MODE=local_simulation resqfly:latest
```
