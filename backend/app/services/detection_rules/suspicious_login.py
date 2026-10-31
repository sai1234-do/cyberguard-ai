from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult
from app.services.detection_rules.base import DetectionRule


class SuspiciousLoginRule(DetectionRule):

    @property
    def name(self) -> str:
        return "Suspicious Login Detection"

    def evaluate(
        self,
        event: SecurityEvent,
    ) -> DetectionResult:

        if event.event_type.lower() == "login_failed" and event.failed_attempts >= 3:

            return DetectionResult(
                detected=True,
                rule_name=self.name,
                severity="medium",
                confidence=0.85,
                reason=(
                    f"Repeated failed login activity detected "
                    f"for user '{event.username}'."
                ),
            )

        return DetectionResult(
            detected=False,
            rule_name=self.name,
            severity="low",
            confidence=1.0,
            reason="No suspicious login pattern detected.",
        )