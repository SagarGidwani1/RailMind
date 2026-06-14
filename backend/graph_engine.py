"""
RailMind — Graph Engine
NetworkX-based cascade delay prediction engine.
Uses the station network graph to propagate delays downstream.
"""

import networkx as nx
from mock_data import STATIONS, TRACKS


class RailwayGraph:
    """
    Builds and manages the railway network graph.
    Stations are nodes, tracks are edges.
    Provides cascade delay analysis when a train is delayed.
    """

    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        """Build the NetworkX graph from mock station and track data."""
        # Add station nodes
        for station in STATIONS:
            self.graph.add_node(
                station["code"],
                name=station["name"],
                lat=station["lat"],
                lon=station["lon"],
                platform_count=station["platform_count"],
                zone=station["zone"],
            )

        # Add track edges (bidirectional)
        for track in TRACKS:
            attrs = {
                "distance_km": track["distance_km"],
                "capacity": track["capacity"],
                "current_occupancy": track["current_occupancy"],
                "travel_time_min": track["travel_time_min"],
            }
            self.graph.add_edge(track["from"], track["to"], **attrs)
            self.graph.add_edge(track["to"], track["from"], **attrs)

    def get_network_data(self) -> dict:
        """
        Returns graph data formatted for D3.js visualization.
        """
        nodes = []
        for code, data in self.graph.nodes(data=True):
            nodes.append({
                "id": code,
                "name": data.get("name", code),
                "lat": data.get("lat", 0),
                "lon": data.get("lon", 0),
                "platform_count": data.get("platform_count", 1),
                "zone": data.get("zone", "CR"),
            })

        links = []
        seen = set()
        for u, v, data in self.graph.edges(data=True):
            edge_key = tuple(sorted([u, v]))
            if edge_key not in seen:
                seen.add(edge_key)
                links.append({
                    "source": u,
                    "target": v,
                    "distance_km": data.get("distance_km", 0),
                    "capacity": data.get("capacity", 2),
                    "current_occupancy": data.get("current_occupancy", 0),
                    "travel_time_min": data.get("travel_time_min", 30),
                })

        return {"nodes": nodes, "links": links}

    def calculate_cascade(
        self,
        delayed_train: dict,
        all_trains: list[dict],
        delay_minutes: int,
    ) -> dict:
        """
        Calculate cascade effects when a train is delayed.

        Algorithm:
        1. Find the delayed train's current position and remaining route
        2. Find all other trains that share downstream tracks or stations
        3. Apply cascade delay factor (0.7 per hop) to affected trains
        4. Return affected trains with predicted delays and reason codes

        Returns a dict with:
        - source_train: the delayed train info
        - affected_trains: list of affected train dicts with cascade details
        - total_passengers_affected: total passengers impacted
        - cascade_depth: how many hops the cascade propagated
        """
        source_station = delayed_train["current_station"]
        source_route = delayed_train["route"]

        # Determine downstream stations from current position
        try:
            current_idx = source_route.index(source_station)
        except ValueError:
            current_idx = 0

        downstream_stations = source_route[current_idx:]

        affected_trains = []
        total_passengers = delayed_train["passengers_count"]
        cascade_depth = 0

        for train in all_trains:
            if train["train_no"] == delayed_train["train_no"]:
                continue

            train_route = train["route"]
            train_current = train["current_station"]

            # Find if this train shares any downstream stations/tracks
            try:
                train_current_idx = train_route.index(train_current)
            except ValueError:
                train_current_idx = 0

            train_remaining = train_route[train_current_idx:]

            # Check for shared stations in the downstream path
            shared_stations = []
            for station in downstream_stations:
                if station in train_remaining:
                    shared_stations.append(station)

            if not shared_stations:
                continue

            # Calculate cascade delay based on hop distance
            # First shared station's hop distance from the delayed train's current pos
            first_shared = shared_stations[0]
            hop_distance = downstream_stations.index(first_shared) if first_shared in downstream_stations else 1
            hop_distance = max(hop_distance, 1)

            # Cascade delay decreases with each hop: delay * 0.7^hop
            cascade_delay = int(delay_minutes * (0.7 ** hop_distance))

            if cascade_delay < 1:
                continue

            cascade_depth = max(cascade_depth, hop_distance)

            # Determine reason code
            reason = self._get_reason_code(
                delayed_train, train, shared_stations, hop_distance
            )

            # Check platform conflict
            platform_conflict = (
                train["current_station"] in shared_stations
                and train["platform_no"] == delayed_train["platform_no"]
            )

            affected_trains.append({
                "train_no": train["train_no"],
                "name": train["name"],
                "current_station": train["current_station"],
                "predicted_delay": cascade_delay,
                "shared_stations": shared_stations,
                "reason_code": reason,
                "platform_conflict": platform_conflict,
                "hop_distance": hop_distance,
                "passengers_count": train["passengers_count"],
                "original_status": train["status"],
            })

            total_passengers += train["passengers_count"]

        # Sort by predicted delay (worst first)
        affected_trains.sort(key=lambda x: x["predicted_delay"], reverse=True)

        return {
            "source_train": {
                "train_no": delayed_train["train_no"],
                "name": delayed_train["name"],
                "delay_minutes": delay_minutes,
                "current_station": source_station,
            },
            "affected_trains": affected_trains,
            "total_passengers_affected": total_passengers,
            "cascade_depth": cascade_depth,
            "downstream_stations": downstream_stations,
        }

    def _get_reason_code(
        self, source: dict, target: dict, shared: list, hops: int
    ) -> str:
        """Generate a human-readable reason code for the cascade effect."""
        if hops == 1:
            return f"TRACK_BLOCK: Train {source['train_no']} blocking section near {shared[0]}"
        elif hops == 2:
            return f"PLATFORM_WAIT: Waiting for platform clearance at {shared[0]}"
        else:
            return f"CASCADED_DELAY: Ripple effect from {source['train_no']} via {', '.join(shared[:2])}"

    def get_station_info(self, station_code: str) -> dict | None:
        """Get info about a specific station."""
        if station_code in self.graph.nodes:
            data = dict(self.graph.nodes[station_code])
            data["code"] = station_code
            # Get connected stations
            neighbors = list(self.graph.successors(station_code))
            data["connected_to"] = neighbors
            return data
        return None


# Singleton instance
railway_graph = RailwayGraph()
