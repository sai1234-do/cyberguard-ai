from dataclasses import dataclass


@dataclass
class DetectionResult:
    detected: bool
    rule_name: str
    severity: str
    confidence: float
    reason: str