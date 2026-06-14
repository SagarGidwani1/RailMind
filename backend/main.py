"""
RailMind — FastAPI Application
Main API server with all endpoints for train management,
cascade simulation, and AI agent recommendations.
"""

import asyncio
import json
import copy
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from mock_data import get_initial_trains, STATIONS, TRACKS
from graph_engine import railway_graph
from ai_agent import get_agent_recommendations
from models import init_db


# ─── In-Memory State ─────────────────────────────────────────────────────────
# We keep trains in memory for fast access; DB is used for event logging.

_trains: list[dict] = []
_cascade_cache: dict[str, dict] = {}


def _reset_trains():
    """Reset all trains to initial on-time state."""
    global _trains, _cascade_cache
    _trains = get_initial_trains()
    _cascade_cache = {}


# ─── App Lifecycle ───────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and train state on startup."""
    init_db()
    _reset_trains()
    print("[RailMind] Backend started - all trains on time")
    yield
    print("[RailMind] Backend shutting down")


app = FastAPI(
    title="RailMind API",
    description="AI-powered Indian Railways cascade delay prediction & resolution",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This allows any website to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request Models ──────────────────────────────────────────────────────────

class SimulateDelayRequest(BaseModel):
    train_no: str
    delay_minutes: int


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/trains")
async def get_trains():
    """Returns all train statuses."""
    return {"trains": _trains, "count": len(_trains)}


@app.get("/api/network")
async def get_network():
    """Returns station graph data formatted for D3.js visualization."""
    network = railway_graph.get_network_data()

    # Attach current trains to their stations
    station_trains: dict[str, list] = {}
    for train in _trains:
        station = train["current_station"]
        if station not in station_trains:
            station_trains[station] = []
        station_trains[station].append({
            "train_no": train["train_no"],
            "name": train["name"],
            "status": train["status"],
            "delay_minutes": train["delay_minutes"],
            "platform_no": train["platform_no"],
        })

    for node in network["nodes"]:
        node["trains"] = station_trains.get(node["id"], [])

    return network


@app.post("/api/simulate-delay")
async def simulate_delay(request: SimulateDelayRequest):
    """
    Simulate a delay on a specific train and calculate cascade effects.
    Updates all affected trains' statuses in memory.
    """
    global _cascade_cache

    # Find the train
    target_train = None
    for train in _trains:
        if train["train_no"] == request.train_no:
            target_train = train
            break

    if not target_train:
        raise HTTPException(status_code=404, detail=f"Train {request.train_no} not found")

    if request.delay_minutes < 1 or request.delay_minutes > 180:
        raise HTTPException(status_code=400, detail="Delay must be between 1 and 180 minutes")

    # Apply delay to the source train
    target_train["delay_minutes"] = request.delay_minutes
    target_train["status"] = "delayed"

    # Calculate actual departure
    h, m = map(int, target_train["scheduled_dep"].split(":"))
    total_min = h * 60 + m + request.delay_minutes
    new_h, new_m = divmod(total_min, 60)
    new_h = new_h % 24
    target_train["actual_dep"] = f"{new_h:02d}:{new_m:02d}"

    # Run cascade analysis
    cascade = railway_graph.calculate_cascade(
        target_train, _trains, request.delay_minutes
    )

    # Apply cascade effects to affected trains
    for affected in cascade["affected_trains"]:
        for train in _trains:
            if train["train_no"] == affected["train_no"]:
                train["delay_minutes"] = affected["predicted_delay"]
                train["status"] = "at_risk" if affected["predicted_delay"] < 15 else "delayed"

                # Update actual departure
                h2, m2 = map(int, train["scheduled_dep"].split(":"))
                total2 = h2 * 60 + m2 + affected["predicted_delay"]
                nh2, nm2 = divmod(total2, 60)
                nh2 = nh2 % 24
                train["actual_dep"] = f"{nh2:02d}:{nm2:02d}"
                break

    # Cache cascade results
    _cascade_cache[request.train_no] = cascade

    return {
        "success": True,
        "cascade": cascade,
        "trains": _trains,
    }


@app.get("/api/cascade/{train_no}")
async def get_cascade(train_no: str):
    """Returns cached cascade data for a train, or calculates it fresh."""
    if train_no in _cascade_cache:
        return _cascade_cache[train_no]

    # Find the train
    target = None
    for train in _trains:
        if train["train_no"] == train_no:
            target = train
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Train {train_no} not found")

    if target["delay_minutes"] == 0:
        return {
            "source_train": {
                "train_no": target["train_no"],
                "name": target["name"],
                "delay_minutes": 0,
                "current_station": target["current_station"],
            },
            "affected_trains": [],
            "total_passengers_affected": 0,
            "cascade_depth": 0,
        }

    cascade = railway_graph.calculate_cascade(target, _trains, target["delay_minutes"])
    return cascade


@app.post("/api/agent/recommend")
async def agent_recommend(request: SimulateDelayRequest):
    """
    Get AI agent recommendations for a cascade delay scenario.
    Streams response via Server-Sent Events (SSE).
    """
    # Get or compute cascade data
    if request.train_no in _cascade_cache:
        cascade = _cascade_cache[request.train_no]
    else:
        target = None
        for train in _trains:
            if train["train_no"] == request.train_no:
                target = train
                break

        if not target:
            raise HTTPException(status_code=404, detail=f"Train {request.train_no} not found")

        cascade = railway_graph.calculate_cascade(
            target, _trains, request.delay_minutes
        )

    async def event_stream():
        """Generate SSE events from the AI agent."""
        try:
            async for chunk in get_agent_recommendations(cascade, _trains):
                # SSE format
                data = json.dumps({"text": chunk})
                yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/reset")
async def reset_trains():
    """Reset all trains to initial on-time state."""
    _reset_trains()
    return {"success": True, "message": "All trains reset to on-time", "trains": _trains}


@app.get("/api/station/{station_code}")
async def get_station(station_code: str):
    """Get detailed info about a specific station."""
    info = railway_graph.get_station_info(station_code)
    if not info:
        raise HTTPException(status_code=404, detail=f"Station {station_code} not found")

    # Add trains currently at this station
    trains_at_station = [t for t in _trains if t["current_station"] == station_code]
    info["trains"] = trains_at_station
    return info


# ─── Health Check ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "app": "RailMind",
        "version": "1.0.0",
        "status": "operational",
        "trains_loaded": len(_trains),
    }
