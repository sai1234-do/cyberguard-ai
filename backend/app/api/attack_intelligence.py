import json

from fastapi import APIRouter, Depends, HTTPException, Query
from groq import Groq
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.services.attack_intelligence import build_attack_campaigns


router = APIRouter(
    prefix="/api/attack-intelligence",
    tags=["Attack Intelligence"],
)


def _get_campaign(
    db: Session,
    campaign_id: str,
    window_minutes: int,
):
    campaigns = build_attack_campaigns(
        db=db,
        window_minutes=window_minutes,
        limit=1000,
    )

    for campaign in campaigns:
        if campaign["id"] == campaign_id:
            return campaign

    raise HTTPException(
        status_code=404,
        detail=(
            "Campaign not found. It may have changed because "
            "new events were uploaded or the time window changed."
        ),
    )


@router.get("/campaigns")
def get_attack_campaigns(
    window_minutes: int = Query(30, ge=5, le=1440),
    limit: int = Query(1000, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = build_attack_campaigns(
        db=db,
        window_minutes=window_minutes,
        limit=limit,
    )

    return {
        "total_campaigns": len(campaigns),
        "window_minutes": window_minutes,
        "campaigns": [
            {
                key: value
                for key, value in campaign.items()
                if key not in {"timeline", "graph", "evidence"}
            }
            for campaign in campaigns
        ],
    }


@router.get("/campaigns/{campaign_id}")
def get_attack_campaign(
    campaign_id: str,
    window_minutes: int = Query(30, ge=5, le=1440),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_campaign(
        db=db,
        campaign_id=campaign_id,
        window_minutes=window_minutes,
    )


@router.post("/campaigns/{campaign_id}/analyze")
def analyze_attack_campaign(
    campaign_id: str,
    window_minutes: int = Query(30, ge=5, le=1440),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = _get_campaign(
        db=db,
        campaign_id=campaign_id,
        window_minutes=window_minutes,
    )

    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Groq API key is not configured.",
        )

    # Send only the evidence required for the investigation.
    context = {
        "campaign_title": campaign["title"],
        "risk_score": campaign["risk_score"],
        "risk_label": campaign["risk_label"],
        "correlation_basis": campaign["correlation_basis"],
        "start_time": campaign["start_time"],
        "end_time": campaign["end_time"],
        "event_count": campaign["event_count"],
        "suspicious_event_count": campaign[
            "suspicious_event_count"
        ],
        "incident_count": campaign["incident_count"],
        "attack_types": campaign["attack_types"],
        "source_ips": campaign["source_ips"],
        "usernames": campaign["usernames"],
        "devices": campaign["devices"],
        "evidence": campaign["evidence"][:50],
    }

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a defensive cybersecurity "
                        "investigation assistant. Analyze only "
                        "the supplied campaign evidence. "
                        "Never invent events, identities, or "
                        "attack steps. A shared IP, username, "
                        "or device is correlation evidence, not "
                        "proof that activities belong to one "
                        "attacker. Clearly separate observed "
                        "facts from hypotheses. Do not claim "
                        "that containment or remediation has "
                        "already happened. Return valid JSON "
                        "with exactly these keys: "
                        '"summary" (string), '
                        '"key_observations" (array of strings), '
                        '"possible_attack_narrative" (string), '
                        '"recommendations" (array of 3 to 5 strings), '
                        '"confidence_note" (string).'
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        context,
                        ensure_ascii=False,
                    ),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1600,
        )

        content = completion.choices[0].message.content

        if not content:
            raise ValueError("Groq returned an empty response.")

        analysis = json.loads(content)

        required_strings = [
            "summary",
            "possible_attack_narrative",
            "confidence_note",
        ]

        for key in required_strings:
            if (
                not isinstance(analysis.get(key), str)
                or not analysis[key].strip()
            ):
                raise ValueError(
                    f"Invalid AI response field: {key}"
                )

        for key in ["key_observations", "recommendations"]:
            value = analysis.get(key)

            if (
                not isinstance(value, list)
                or not value
                or not all(
                    isinstance(item, str) and item.strip()
                    for item in value
                )
            ):
                raise ValueError(
                    f"Invalid AI response field: {key}"
                )

        return {
            "campaign_id": campaign_id,
            "analysis": analysis,
        }

    except Exception as exc:
        print(
            "Attack campaign analysis failed:",
            type(exc).__name__,
            str(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Campaign AI analysis failed. "
                "Check backend logs and retry."
            ),
        ) from exc
