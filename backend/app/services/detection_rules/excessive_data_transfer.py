from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult
from app.services.detection_rules.base import DetectionRule


class ExcessiveDataTransferRule(DetectionRule):

    BYTES_THRESHOLD = 10_000_000

    @property
    def name(self) -> str:
        return "Excessive Data Transfer Detection"

    def evaluate(
        self,
        event: SecurityEvent,
    ) -> DetectionResult:

        if event.bytes_transferred >= self.BYTES_THRESHOLD:

            return DetectionResult(
                detected=True,
                rule_name=self.name,
                severity="high",
                confidence=0.90,
                reason=(
                    f"Excessive data transfer detected: "
                    f"{event.bytes_transferred} bytes."
                ),
            )

        return DetectionResult(
            detected=False,
            rule_name=self.name,
            severity="low",
            confidence=1.0,
            reason="Data transfer is within the expected threshold.",
        )