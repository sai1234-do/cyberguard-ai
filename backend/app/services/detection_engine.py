from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult
from app.services.detection_rules.base import DetectionRule


class DetectionEngine:

    def __init__(
        self,
        rules: list[DetectionRule],
    ):
        self.rules = rules

    def evaluate(
        self,
        event: SecurityEvent,
    ) -> list[DetectionResult]:

        results: list[DetectionResult] = []

        for rule in self.rules:

            result = rule.evaluate(event)

            if result.detected:
                results.append(result)

        return results