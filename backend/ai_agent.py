"""
RailMind — AI Agent
Anthropic Claude-powered operations controller that analyzes cascade delays
and provides actionable recommendations via streaming.
"""

import os
import json
import anthropic
from typing import AsyncGenerator


SYSTEM_PROMPT = """You are RailMind, an AI operations controller for Indian Railways.
You specialize in the Mumbai-Pune corridor operations.

Given a cascade delay scenario, provide 3-4 specific actionable recommendations.

Each recommendation MUST have:
- **Action Type**: One of HOLD, SWAP, ALERT, or CANCEL
- **Train Number**: The specific train number this action applies to
- **Action**: A precise operational instruction (2-3 sentences max)
- **Time Impact**: Estimated time in minutes this action takes to implement
- **Delay Saved**: Expected minutes of delay saved by this action

Format each recommendation as:

### [ACTION_TYPE] — Train [TRAIN_NUMBER]
**Action:** [Specific instruction]
**Implementation Time:** [X] minutes
**Expected Delay Saved:** [Y] minutes

After all recommendations, provide:

### SUMMARY
**Total Estimated Delay Saved:** [sum] minutes
**Risk Level:** [LOW/MEDIUM/HIGH]
**Priority:** [Which recommendation to execute first and why]

Be precise, operational, and confident. Use Indian Railways terminology.
Reference specific stations, platforms, and sections in your recommendations.
Never suggest anything generic — every recommendation must reference specific
train numbers and stations from the data provided."""


async def get_agent_recommendations(
    cascade_data: dict,
    trains: list[dict],
) -> AsyncGenerator[str, None]:
    """
    Stream AI recommendations from Claude based on cascade delay data.

    Yields text chunks as they arrive from the API.
    Falls back to a mock response if the API key is not configured.
    """
    # Build context message for Claude
    source = cascade_data["source_train"]
    affected = cascade_data["affected_trains"]
    total_pax = cascade_data["total_passengers_affected"]

    # Build station platform availability info
    station_platforms = {}
    for train in trains:
        station = train["current_station"]
        if station not in station_platforms:
            station_platforms[station] = {"occupied": [], "train_count": 0}
        station_platforms[station]["occupied"].append(train["platform_no"])
        station_platforms[station]["train_count"] += 1

    user_message = f"""
DELAY INCIDENT REPORT:
=====================
Source Train: {source['train_no']} ({source['name']})
Delay: {source['delay_minutes']} minutes
Current Location: {source['current_station']}

AFFECTED TRAINS ({len(affected)} trains impacted):
{"=" * 50}
"""
    for t in affected:
        user_message += f"""
Train {t['train_no']} ({t['name']}):
  - Currently at: {t['current_station']}
  - Predicted delay: {t['predicted_delay']} minutes
  - Shared stations: {', '.join(t['shared_stations'])}
  - Reason: {t['reason_code']}
  - Platform conflict: {'YES' if t['platform_conflict'] else 'No'}
  - Passengers: {t['passengers_count']}
"""

    user_message += f"""
TOTAL PASSENGERS AFFECTED: {total_pax}
CASCADE DEPTH: {cascade_data['cascade_depth']} hops

STATION PLATFORM STATUS:
"""
    for station, info in station_platforms.items():
        user_message += f"  {station}: {info['train_count']} trains, platforms {info['occupied']} occupied\n"

    user_message += "\nProvide your operational recommendations now."

    # Check for API key
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if not api_key:
        # Provide a realistic mock response when no API key is available
        for chunk in _mock_response_sync(source, affected, total_pax):
            yield chunk
        return

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)

        async with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    except anthropic.APIError as e:
        yield f"\n\n⚠️ API Error: {str(e)}\n\nFalling back to mock recommendations...\n\n"
        for chunk in _mock_response_sync(source, affected, total_pax):
            yield chunk
    except Exception as e:
        yield f"\n\n⚠️ Error: {str(e)}\n\nFalling back to mock recommendations...\n\n"
        for chunk in _mock_response_sync(source, affected, total_pax):
            yield chunk


def _mock_response_sync(source: dict, affected: list, total_pax: int):
    """
    Generate a realistic mock response when Claude API is not available.
    Returns an iterator of text chunks to simulate streaming.
    """
    affected_nums = [t["train_no"] for t in affected[:3]]
    worst = affected[0] if affected else None

    response_parts = [
        f"### HOLD — Train {source['train_no']}\n",
        f"**Action:** Hold Train {source['train_no']} at {source['current_station']} on current platform. ",
        f"Notify all downstream stations to prepare for revised schedule. ",
        f"Keep passengers informed with PA announcement every 10 minutes.\n",
        f"**Implementation Time:** 5 minutes\n",
        f"**Expected Delay Saved:** 0 minutes (containment action)\n\n",
    ]

    if worst:
        response_parts.extend([
            f"### SWAP — Train {worst['train_no']}\n",
            f"**Action:** Swap platform assignment for Train {worst['train_no']} at {worst['current_station']}. ",
            f"Move from Platform {affected[0].get('shared_stations', ['UNK'])[0]} to alternate platform ",
            f"to avoid blocking conflict with Train {source['train_no']}. ",
            f"Coordinate with station master for immediate track change.\n",
            f"**Implementation Time:** 8 minutes\n",
            f"**Expected Delay Saved:** {worst['predicted_delay'] - 5} minutes\n\n",
        ])

    if len(affected) > 1:
        second = affected[1]
        response_parts.extend([
            f"### ALERT — Train {second['train_no']}\n",
            f"**Action:** Issue priority alert to Train {second['train_no']} crew. ",
            f"Authorize speed increase to 110 km/h on {second['current_station']}-",
            f"{second['shared_stations'][-1] if second['shared_stations'] else 'next'} section ",
            f"after clearance of Train {source['train_no']}. ",
            f"This will recover approximately {int(second['predicted_delay'] * 0.6)} minutes of lost time.\n",
            f"**Implementation Time:** 3 minutes\n",
            f"**Expected Delay Saved:** {int(second['predicted_delay'] * 0.6)} minutes\n\n",
        ])

    if len(affected) > 2:
        third = affected[2]
        response_parts.extend([
            f"### ALERT — Train {third['train_no']}\n",
            f"**Action:** Send advance warning to {third['current_station']} station master. ",
            f"Prepare Platform 1 for Train {third['train_no']} arrival. ",
            f"Pre-position shunting engine if platform swap becomes necessary. ",
            f"Keep Divisional Control informed.\n",
            f"**Implementation Time:** 4 minutes\n",
            f"**Expected Delay Saved:** {int(third['predicted_delay'] * 0.4)} minutes\n\n",
        ])

    total_saved = sum(
        int(t["predicted_delay"] * 0.5) for t in affected[:3]
    )
    response_parts.extend([
        f"### SUMMARY\n",
        f"**Total Estimated Delay Saved:** {total_saved} minutes\n",
        f"**Risk Level:** {'HIGH' if source['delay_minutes'] > 30 else 'MEDIUM'}\n",
        f"**Priority:** Execute SWAP for Train {worst['train_no'] if worst else 'N/A'} immediately — ",
        f"this addresses the primary platform conflict and unlocks the cascade bottleneck. ",
        f"Total {total_pax:,} passengers across {len(affected)} trains are affected.\n",
    ])

    return response_parts
