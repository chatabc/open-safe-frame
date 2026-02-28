"""Alerting system implementation."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4


class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Alert:
    id: str = field(default_factory=lambda: str(uuid4()))
    title: str = ""
    message: str = ""
    severity: AlertSeverity = AlertSeverity.INFO
    source: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None


class AlertingSystem:
    def __init__(self):
        self._alerts: dict[str, Alert] = {}
        self._admin_contacts: list[str] = []
        self._notification_handlers: list[callable] = []
    
    def send_alert(self, alert: Alert) -> None:
        self._alerts[alert.id] = alert
        self._notify_handlers(alert)
    
    def create_alert(
        self,
        title: str,
        message: str,
        severity: AlertSeverity = AlertSeverity.INFO,
        source: str = "",
    ) -> Alert:
        alert = Alert(
            title=title,
            message=message,
            severity=severity,
            source=source,
        )
        self.send_alert(alert)
        return alert
    
    def notify_administrators(self, message: str) -> None:
        for contact in self._admin_contacts:
            pass
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        alert = self._alerts.get(alert_id)
        if not alert:
            return False
        
        alert.acknowledged = True
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.now()
        
        return True
    
    def get_alert(self, alert_id: str) -> Optional[Alert]:
        return self._alerts.get(alert_id)
    
    def get_active_alerts(self) -> list[Alert]:
        return [a for a in self._alerts.values() if not a.acknowledged]
    
    def get_all_alerts(self) -> list[Alert]:
        return list(self._alerts.values())
    
    def add_admin_contact(self, contact: str) -> None:
        self._admin_contacts.append(contact)
    
    def register_notification_handler(self, handler: callable) -> None:
        self._notification_handlers.append(handler)
    
    def _notify_handlers(self, alert: Alert) -> None:
        for handler in self._notification_handlers:
            try:
                handler(alert)
            except Exception:
                pass
