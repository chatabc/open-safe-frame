"""Event handler for notifications."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from open_safe_frame.notification.models import Notification, NotificationType
from open_safe_frame.notification.notification_manager import NotificationManager


@dataclass
class SecurityEvent:
    event_type: str
    severity: str
    description: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionEvent:
    execution_id: str
    status: str
    description: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RiskEvent:
    risk_level: str
    category: str
    description: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)


class NotificationEventHandler:
    def __init__(self, notification_manager: NotificationManager):
        self.notification_manager = notification_manager
        self._event_handlers: dict[str, list[callable]] = {
            "security": [],
            "execution": [],
            "risk": [],
        }
    
    async def handle_security_event(self, event: SecurityEvent) -> Optional[Notification]:
        notification_type = (
            NotificationType.CRITICAL_ALERT
            if event.severity in ["critical", "high"]
            else NotificationType.SECURITY_WARNING
        )
        
        notification = self.notification_manager.create_notification(
            notification_type=notification_type,
            title=f"🚨 安全事件: {event.event_type}",
            body=event.description,
            data={
                "event_type": event.event_type,
                "severity": event.severity,
                "timestamp": event.timestamp.isoformat(),
                "metadata": event.metadata,
            },
            actions=[
                {"label": "查看详情", "type": "link", "url": "/security/events"},
                {"label": "紧急停止", "type": "callback", "action": "emergency_stop"},
            ],
        )
        
        await self.notification_manager.send_notification(notification)
        
        self._notify_handlers("security", event)
        
        return notification
    
    async def handle_execution_event(self, event: ExecutionEvent) -> Optional[Notification]:
        notification_type = NotificationType.EXECUTION_UPDATE
        
        if event.status in ["failed", "error"]:
            notification_type = NotificationType.SECURITY_WARNING
        
        notification = self.notification_manager.create_notification(
            notification_type=notification_type,
            title=f"📋 执行更新: {event.execution_id}",
            body=event.description,
            data={
                "execution_id": event.execution_id,
                "status": event.status,
                "timestamp": event.timestamp.isoformat(),
            },
        )
        
        await self.notification_manager.send_notification(notification)
        
        self._notify_handlers("execution", event)
        
        return notification
    
    async def handle_risk_event(self, event: RiskEvent) -> Optional[Notification]:
        notification_type = (
            NotificationType.CRITICAL_ALERT
            if event.risk_level in ["critical", "high"]
            else NotificationType.SECURITY_WARNING
        )
        
        notification = self.notification_manager.create_notification(
            notification_type=notification_type,
            title=f"⚠️ 风险告警: {event.category}",
            body=event.description,
            data={
                "risk_level": event.risk_level,
                "category": event.category,
                "timestamp": event.timestamp.isoformat(),
            },
            actions=[
                {"label": "风险评估", "type": "link", "url": "/risk/assessment"},
                {"label": "查看详情", "type": "callback", "action": "view_details"},
            ],
        )
        
        await self.notification_manager.send_notification(notification)
        
        self._notify_handlers("risk", event)
        
        return notification
    
    def register_handler(self, event_category: str, handler: callable) -> None:
        if event_category in self._event_handlers:
            self._event_handlers[event_category].append(handler)
    
    def _notify_handlers(self, event_category: str, event: Any) -> None:
        handlers = self._event_handlers.get(event_category, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception:
                pass
