from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult
from app.services.detection_rules.base import DetectionRule


class PortScanRule(DetectionRule):

    @property
    def name(self) -> str:
        return "Port Scan Detection"

    def evaluate(
        self,
        event: SecurityEvent,
    ) -> DetectionResult:

        if event.event_type.lower() in {
            "port_scan",
            "network_scan",
            "scan_detected",
        }:

            return DetectionResult(
                detected=True,
                rule_name=self.name,
                severity="high",
                confidence=0.92,
                reason=(
                    f"Possible network scanning activity detected "
                    f"from source IP {event.source_ip}."
                ),
            )

        return DetectionResult(
            detected=False,
            rule_name=self.name,
            severity="low",
            confidence=1.0,
            reason="No port scanning activity detected.",
        )

''' now we have:                 DetectionEngine
                       │
       ┌───────────────┼────────────────┐
       ↓               ↓                ↓
 Brute Force     Suspicious Login   Data Transfer
       │               │                │
       └───────────────┼────────────────┘
                       ↓
                   Port Scan'''