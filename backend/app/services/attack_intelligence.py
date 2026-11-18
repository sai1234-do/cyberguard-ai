import hashlib
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.security_event import SecurityEvent


SEVERITY_BASE = {
    "critical": 90,
    "high": 75,
    "medium": 45,
    "low": 15,
    "info": 5,
}


def _utc(value: datetime) -> datetime:
    """Normalize database timestamps for safe comparisons."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _event_keys(event: SecurityEvent) -> set[tuple[str, str]]:
    """Return identifiers that can correlate two events."""
    keys = set()

    if event.source_ip:
        keys.add(("ip", event.source_ip.strip().lower()))

    if event.username:
        keys.add(("user", event.username.strip().lower()))

    if event.device:
        keys.add(("device", event.device.strip().lower()))

    return {key for key in keys if key[1]}


def _risk_score(events, incidents) -> int:
    """
    Explainable campaign triage heuristic.
    This is not a probability of compromise.
    """
    base_scores = []

    for event in events:
        if event.is_suspicious:
            base_scores.append(
                float(event.risk_score or 0)
            )
        else:
            base_scores.append(
                SEVERITY_BASE.get(
                    (event.severity or "low").lower(),
                    15,
                )
            )

    base = max(base_scores, default=0)

    suspicious_count = sum(
        1 for event in events if event.is_suspicious
    )

    attack_categories = {
        (incident.attack_type or incident.title or "Unknown").strip()
        for incident in incidents
    }

    suspicious_bonus = min(
        15,
        max(0, suspicious_count - 1) * 3,
    )

    category_bonus = min(
        15,
        max(0, len(attack_categories) - 1) * 5,
    )

    incident_bonus = min(
        10,
        len(incidents) * 2,
    )

    return min(
        100,
        round(
            base
            + suspicious_bonus
            + category_bonus
            + incident_bonus
        ),
    )


def _risk_label(score: int) -> str:
    if score >= 85:
        return "critical"
    if score >= 65:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def _campaign_id(events) -> str:
    event_ids = sorted(event.id for event in events)
    raw = ":".join(map(str, event_ids))
    digest = hashlib.sha256(raw.encode()).hexdigest()[:12]
    return f"cmp-{digest}"


def _build_campaign(events, incident_map):
    events = sorted(
        events,
        key=lambda item: _utc(item.timestamp),
    )

    event_ids = {event.id for event in events}

    incidents_by_id = {}

    for event in events:
        for incident in incident_map.get(event.id, []):
            incidents_by_id[incident.id] = incident

    incidents = list(incidents_by_id.values())

    suspicious_count = sum(
        1 for event in events if event.is_suspicious
    )

    source_ips = sorted({
        event.source_ip
        for event in events
        if event.source_ip
    })

    usernames = sorted({
        event.username
        for event in events
        if event.username
    })

    devices = sorted({
        event.device
        for event in events
        if event.device
    })

    attack_types = sorted({
        (
            incident.attack_type
            or incident.title
            or "Unknown detection"
        )
        for incident in incidents
    })

    if not attack_types:
        attack_types = sorted({
            event.event_type for event in events
        })

    risk_score = _risk_score(events, incidents)
    risk_label = _risk_label(risk_score)

    first_seen = _utc(events[0].timestamp)
    last_seen = _utc(events[-1].timestamp)

    campaign_id = _campaign_id(events)

    if attack_types:
        title = " / ".join(attack_types[:2])
        if len(attack_types) > 2:
            title += f" +{len(attack_types) - 2} more"
    else:
        title = "Correlated security activity"

    # --------------------------------------------------------
    # GRAPH NODES AND EDGES
    # --------------------------------------------------------

    nodes = []
    edges = []

    entity_nodes = {}

    def add_entity(kind, value):
        key = (kind, value)

        if key in entity_nodes:
            return entity_nodes[key]

        node_id = f"{kind}:{value}"

        labels = {
            "ip": "SOURCE IP",
            "user": "USER ACCOUNT",
            "device": "DEVICE",
        }

        entity_nodes[key] = node_id

        nodes.append({
            "id": node_id,
            "type": "entity",
            "position": {
                "x": 40,
                "y": len(entity_nodes) * 125,
            },
            "data": {
                "label": value,
                "kind": labels.get(kind, kind.upper()),
                "detail": value,
            },
        })

        return node_id

    incident_nodes_added = set()

    for index, event in enumerate(events):
        event_node_id = f"event:{event.id}"

        nodes.append({
            "id": event_node_id,
            "type": "event",
            "position": {
                "x": 380,
                "y": index * 115,
            },
            "data": {
                "label": event.event_type.replace("_", " ").title(),
                "kind": "SUSPICIOUS EVENT" if event.is_suspicious else "SECURITY EVENT",
                "detail": event.description or event.event_type,
                "event_id": event.id,
                "severity": event.severity,
                "timestamp": event.timestamp.isoformat(),
                "risk_score": event.risk_score,
            },
        })

        identifiers = [
            ("ip", event.source_ip, "Source IP"),
            ("user", event.username, "Username"),
            ("device", event.device, "Device"),
        ]

        for kind, value, label in identifiers:
            if not value:
                continue

            entity_id = add_entity(kind, value)

            edges.append({
                "id": f"{entity_id}->{event_node_id}",
                "source": entity_id,
                "target": event_node_id,
                "label": label,
                "type": "smoothstep",
                "animated": event.is_suspicious,
            })

        for incident in incident_map.get(event.id, []):
            incident_node_id = f"incident:{incident.id}"

            if incident.id not in incident_nodes_added:
                incident_nodes_added.add(incident.id)

                nodes.append({
                    "id": incident_node_id,
                    "type": "incident",
                    "position": {
                        "x": 760,
                        "y": len(incident_nodes_added) * 130,
                    },
                    "data": {
                        "label": incident.incident_number,
                        "kind": "DETECTED INCIDENT",
                        "detail": incident.title,
                        "incident_id": incident.id,
                        "severity": incident.severity,
                        "status": incident.status,
                    },
                })

            edges.append({
                "id": f"{event_node_id}->{incident_node_id}",
                "source": event_node_id,
                "target": incident_node_id,
                "label": "Generated incident",
                "type": "smoothstep",
                "animated": True,
            })

    # --------------------------------------------------------
    # INVESTIGATION TIMELINE
    # --------------------------------------------------------

    timeline = []

    for event in events:
        linked_incidents = incident_map.get(event.id, [])

        timeline.append({
            "id": event.id,
            "event_id": event.id,
            "timestamp": event.timestamp.isoformat(),
            "event_type": event.event_type,
            "severity": event.severity,
            "is_suspicious": event.is_suspicious,
            "risk_score": event.risk_score,
            "source_ip": event.source_ip,
            "username": event.username,
            "device": event.device,
            "description": event.description,
            "incident_ids": [
                incident.id for incident in linked_incidents
            ],
        })

    # --------------------------------------------------------
    # CORRELATION EVIDENCE
    # --------------------------------------------------------

    correlation_basis = []

    if len(source_ips) == 1 and len(events) > 1:
        correlation_basis.append(
            "Events share the same source IP."
        )

    if len(usernames) == 1 and len(events) > 1:
        correlation_basis.append(
            "Events reference the same username."
        )

    if len(devices) == 1 and len(events) > 1:
        correlation_basis.append(
            "Events reference the same device."
        )

    return {
        "id": campaign_id,
        "title": title,
        "risk_score": risk_score,
        "risk_label": risk_label,
        "start_time": first_seen.isoformat(),
        "end_time": last_seen.isoformat(),
        "duration_minutes": round(
            (last_seen - first_seen).total_seconds() / 60,
            2,
        ),
        "event_count": len(events),
        "suspicious_event_count": suspicious_count,
        "incident_count": len(incidents),
        "attack_types": attack_types,
        "source_ips": source_ips,
        "usernames": usernames,
        "devices": devices,
        "correlation_basis": correlation_basis,
        "timeline": timeline,
        "graph": {
            "nodes": nodes,
            "edges": edges,
        },
        "evidence": [
            {
                "event_id": event.id,
                "timestamp": event.timestamp.isoformat(),
                "event_type": event.event_type,
                "severity": event.severity,
                "source_ip": event.source_ip,
                "username": event.username,
                "device": event.device,
                "is_suspicious": event.is_suspicious,
                "description": event.description,
            }
            for event in events
        ],
    }


def build_attack_campaigns(
    db: Session,
    window_minutes: int = 30,
    limit: int = 1000,
):
    """
    Correlate recent security events.

    Two events are connected when they:
    - Share a source IP, username, or device.
    - Occur within the configured time gap.

    Only groups with at least two events and at least one
    suspicious event or linked incident become campaigns.
    """

    events = (
        db.query(SecurityEvent)
        .order_by(SecurityEvent.timestamp.desc())
        .limit(limit)
        .all()
    )

    if not events:
        return []

    events.sort(
        key=lambda item: _utc(item.timestamp)
    )

    event_ids = [event.id for event in events]

    incident_map = defaultdict(list)

    links = (
        db.query(IncidentEvent, Incident)
        .join(
            Incident,
            Incident.id == IncidentEvent.incident_id,
        )
        .filter(IncidentEvent.event_id.in_(event_ids))
        .all()
    )

    for link, incident in links:
        incident_map[link.event_id].append(incident)

    # Union-find for event correlation.
    parent = list(range(len(events)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(first, second):
        root_a = find(first)
        root_b = find(second)

        if root_a != root_b:
            parent[root_b] = root_a

    window = timedelta(minutes=window_minutes)

    keys = [
        _event_keys(event)
        for event in events
    ]

    for current_index, current_event in enumerate(events):
        current_time = _utc(current_event.timestamp)

        for previous_index in range(current_index - 1, -1, -1):
            previous_event = events[previous_index]
            previous_time = _utc(previous_event.timestamp)

            if current_time - previous_time > window:
                break

            if keys[current_index] & keys[previous_index]:
                union(current_index, previous_index)

    groups = defaultdict(list)

    for index, event in enumerate(events):
        groups[find(index)].append(event)

    campaigns = []

    for group in groups.values():
        if len(group) < 2:
            continue

        has_suspicious_activity = any(
            event.is_suspicious
            or incident_map.get(event.id)
            for event in group
        )

        if not has_suspicious_activity:
            continue

        campaigns.append(
            _build_campaign(group, incident_map)
        )

    campaigns.sort(
        key=lambda campaign: (
            campaign["risk_score"],
            campaign["end_time"],
        ),
        reverse=True,
    )

    return campaigns
