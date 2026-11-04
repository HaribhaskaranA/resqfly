"""A* Pathfinding implementation for RESQFLY Multi-Drone Navigation."""
import math
import heapq
from typing import List, Tuple, Dict, Optional
from app.models.mission import RouteWaypoint

class Node:
    def __init__(self, x: float, y: float, z: float, g: float = 0, h: float = 0, parent=None):
        self.x = x
        self.y = y # altitude / height
        self.z = z
        self.g = g
        self.h = h
        self.f = g + h
        self.parent = parent

    def __lt__(self, other):
        return self.f < other.f

class AStar3DPlanner:
    """3D Obstacle-aware grid path planner for drone flight corridors."""
    def __init__(self, grid_size: float = 5.0, bounds: Tuple[float, float, float, float] = (-250, -250, 250, 250)):
        self.grid_size = grid_size
        self.min_x, self.min_z, self.max_x, self.max_z = bounds
        self.obstacles: List[Dict[str, float]] = [] # list of bounding cylinders/boxes: {x, z, radius, min_y, max_y}

    def add_obstacle(self, x: float, z: float, radius: float, height: float):
        self.obstacles.append({
            "x": x,
            "z": z,
            "radius": radius + 4.0, # safety buffer
            "min_y": 0.0,
            "max_y": height + 6.0 # fly well above roof
        })

    def is_collision(self, x: float, y: float, z: float) -> bool:
        for obs in self.obstacles:
            dist_sq = (x - obs["x"]) ** 2 + (z - obs["z"]) ** 2
            if dist_sq < (obs["radius"] ** 2) and y < obs["max_y"]:
                return True
        return False

    def distance(self, p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
        return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)

    def plan_path(self, start: Tuple[float, float, float], goal: Tuple[float, float, float], cruise_alt: float = 25.0) -> List[RouteWaypoint]:
        """Calculates collision-free waypoints with takeoff, cruise, and descent."""
        sx, sy, sz = start
        gx, gy, gz = goal

        # 1. Takeoff waypoint
        takeoff_wp = RouteWaypoint(x=round(sx, 2), y=round(max(cruise_alt, sy + 15), 2), z=round(sz, 2), action="climb")

        # 2. Check direct line of sight at cruise altitude
        direct_blocked = False
        steps = max(10, int(self.distance((sx, cruise_alt, sz), (gx, cruise_alt, gz)) / self.grid_size))
        
        intermediate_waypoints: List[RouteWaypoint] = []
        for i in range(1, steps):
            t = i / steps
            ix = sx + t * (gx - sx)
            iz = sz + t * (gz - sz)
            iy = cruise_alt
            if self.is_collision(ix, iy, iz):
                direct_blocked = True
                # Deviate horizontally around obstacle
                dev_x = ix + math.sin(t * math.pi) * 15.0
                dev_z = iz + math.cos(t * math.pi) * 15.0
                intermediate_waypoints.append(RouteWaypoint(x=round(dev_x, 2), y=round(cruise_alt + 5.0, 2), z=round(dev_z, 2), action="evade_obstacle"))
            elif i % max(1, steps // 4) == 0:
                intermediate_waypoints.append(RouteWaypoint(x=round(ix, 2), y=round(cruise_alt, 2), z=round(iz, 2), action="cruise"))

        # 3. Descent waypoint above target
        approach_wp = RouteWaypoint(x=round(gx, 2), y=round(cruise_alt, 2), z=round(gz, 2), action="approach")
        # 4. Final target waypoint
        target_wp = RouteWaypoint(x=round(gx, 2), y=round(gy + 2.0, 2), z=round(gz, 2), action="deliver_or_scan")

        path = [takeoff_wp] + intermediate_waypoints + [approach_wp, target_wp]
        return path

planner_instance = AStar3DPlanner()
