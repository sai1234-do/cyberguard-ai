from abc import ABC, abstractmethod

from app.models.security_event import SecurityEvent
from app.services.detection_result import DetectionResult


class DetectionRule(ABC):

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the unique name of the detection rule."""
        pass

    @abstractmethod
    def evaluate(
        self,
        event: SecurityEvent,
    ) -> DetectionResult:
        """Evaluate a security event."""
        pass