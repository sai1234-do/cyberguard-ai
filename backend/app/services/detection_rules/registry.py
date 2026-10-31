from app.services.detection_rules.brute_force import BruteForceRule
from app.services.detection_rules.suspicious_login import SuspiciousLoginRule
from app.services.detection_rules.excessive_data_transfer import (
    ExcessiveDataTransferRule,
)
from app.services.detection_rules.port_scan import PortScanRule


def get_detection_rules():
    return [
        BruteForceRule(),
        SuspiciousLoginRule(),
        ExcessiveDataTransferRule(),
        PortScanRule(),
    ]