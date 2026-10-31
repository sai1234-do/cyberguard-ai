from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult
from app.services.detection_rules.base import DetectionRule


class BruteForceRule(DetectionRule):

    FAILED_ATTEMPT_THRESHOLD = 5

    @property
    def name(self) -> str:
        return "Brute Force Detection"

    def evaluate(
        self,
        event: SecurityEvent,
    ) -> DetectionResult:

        if event.failed_attempts >= self.FAILED_ATTEMPT_THRESHOLD:

            return DetectionResult(
                detected=True,
                rule_name=self.name,
                severity="high",
                confidence=0.95,
                reason=(
                    f"Brute force pattern detected: "
                    f"{event.failed_attempts} failed login attempts."
                ),
            )

        return DetectionResult(
            detected=False,
            rule_name=self.name,
            severity="low",
            confidence=1.0,
            reason=(
                "Failed login attempts are below "
                "the detection threshold."
            ),
        )