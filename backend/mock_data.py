"""
RailMind — Mock Data for Mumbai-Pune Corridor
Realistic Indian Railways train data for demonstration.
"""

from datetime import datetime, timedelta

# ─── Station Data ────────────────────────────────────────────────────────────

STATIONS = [
    {
        "code": "CSMT",
        "name": "Mumbai CST",
        "lat": 18.9398,
        "lon": 72.8354,
        "platform_count": 18,
        "zone": "CR",
    },
    {
        "code": "TNA",
        "name": "Thane",
        "lat": 19.1860,
        "lon": 72.9750,
        "platform_count": 8,
        "zone": "CR",
    },
    {
        "code": "KJT",
        "name": "Karjat",
        "lat": 18.9107,
        "lon": 73.3248,
        "platform_count": 5,
        "zone": "CR",
    },
    {
        "code": "LNL",
        "name": "Lonavala",
        "lat": 18.7546,
        "lon": 73.4062,
        "platform_count": 4,
        "zone": "CR",
    },
    {
        "code": "KK",
        "name": "Khadki",
        "lat": 18.5642,
        "lon": 73.8508,
        "platform_count": 3,
        "zone": "CR",
    },
    {
        "code": "PUNE",
        "name": "Pune Junction",
        "lat": 18.5285,
        "lon": 73.8743,
        "platform_count": 6,
        "zone": "CR",
    },
]

# Track segments connecting stations (edges for the graph)
TRACKS = [
    {"from": "CSMT", "to": "TNA", "distance_km": 34, "capacity": 4, "current_occupancy": 2, "travel_time_min": 40},
    {"from": "TNA", "to": "KJT", "distance_km": 65, "capacity": 3, "current_occupancy": 1, "travel_time_min": 55},
    {"from": "KJT", "to": "LNL", "distance_km": 28, "capacity": 2, "current_occupancy": 1, "travel_time_min": 35},
    {"from": "LNL", "to": "KK", "distance_km": 52, "capacity": 2, "current_occupancy": 1, "travel_time_min": 50},
    {"from": "KK", "to": "PUNE", "distance_km": 6, "capacity": 3, "current_occupancy": 1, "travel_time_min": 10},
]

# ─── Train Data ──────────────────────────────────────────────────────────────

def _time(h: int, m: int) -> str:
    """Helper to format time as HH:MM string."""
    return f"{h:02d}:{m:02d}"


def get_initial_trains() -> list[dict]:
    """
    Returns 8 realistic trains on the Mumbai-Pune corridor.
    All start with on_time status and 0 delay.
    """
    return [
        {
            "train_no": "12127",
            "name": "Mumbai CST-Pune Intercity Exp",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(6, 40),
            "actual_dep": _time(6, 40),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "KJT",
            "platform_no": 2,
            "passengers_count": 1150,
            "route": ["CSMT", "TNA", "KJT", "LNL", "KK", "PUNE"],
        },
        {
            "train_no": "12124",
            "name": "Deccan Queen",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(7, 15),
            "actual_dep": _time(7, 15),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "TNA",
            "platform_no": 3,
            "passengers_count": 950,
            "route": ["CSMT", "TNA", "LNL", "KK", "PUNE"],
        },
        {
            "train_no": "11007",
            "name": "Deccan Express",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(7, 0),
            "actual_dep": _time(7, 0),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "TNA",
            "platform_no": 5,
            "passengers_count": 870,
            "route": ["CSMT", "TNA", "KJT", "LNL", "KK", "PUNE"],
        },
        {
            "train_no": "12105",
            "name": "Vidarbha Express",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(6, 10),
            "actual_dep": _time(6, 10),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "LNL",
            "platform_no": 1,
            "passengers_count": 1340,
            "route": ["CSMT", "TNA", "KJT", "LNL", "KK", "PUNE"],
        },
        {
            "train_no": "12125",
            "name": "Pragati Express",
            "from_station": "PUNE",
            "to_station": "CSMT",
            "scheduled_dep": _time(7, 30),
            "actual_dep": _time(7, 30),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "KK",
            "platform_no": 2,
            "passengers_count": 780,
            "route": ["PUNE", "KK", "LNL", "KJT", "TNA", "CSMT"],
        },
        {
            "train_no": "11057",
            "name": "Mumbai CST-Pune Passenger",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(5, 30),
            "actual_dep": _time(5, 30),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "KK",
            "platform_no": 1,
            "passengers_count": 620,
            "route": ["CSMT", "TNA", "KJT", "LNL", "KK", "PUNE"],
        },
        {
            "train_no": "12129",
            "name": "Pune Intercity SF Exp",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(8, 0),
            "actual_dep": _time(8, 0),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "CSMT",
            "platform_no": 7,
            "passengers_count": 1020,
            "route": ["CSMT", "TNA", "KJT", "LNL", "KK", "PUNE"],
        },
        {
            "train_no": "11029",
            "name": "Koyna Express",
            "from_station": "CSMT",
            "to_station": "PUNE",
            "scheduled_dep": _time(5, 55),
            "actual_dep": _time(5, 55),
            "delay_minutes": 0,
            "status": "on_time",
            "current_station": "LNL",
            "platform_no": 3,
            "passengers_count": 740,
            "route": ["CSMT", "TNA", "KJT", "LNL", "KK", "PUNE"],
        },
    ]
