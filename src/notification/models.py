"""Notification data models."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4


class NotificationType(Enum):
    CRITICAL_ALERT = "critical_alert"
    SECURITY_WARNING = "security_warning"
    EXECUTION_UPDATE = "execution_update"
    SYSTEM_STATUS = "system_status"
    APPROVAL_REQUEST = "approval_request"
    DAILY_SUMMARY = "daily_summary"


class NotificationPriority(Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


class NotificationChannel(Enum):
    FEISHU = "feishu"
    TELEGRAM = "telegram"
    WECHAT = "wechat"
    DINGTALK = "dingtalk"
    SLACK = "slack"
    WEBHOOK = "webhook"


class NotificationStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    ACKNOWLEDGED = "acknowledged"


@dataclass
class Notification:
    id: str = field(default_factory=lambda: str(uuid4()))
    notification_type: NotificationType = NotificationType.SYSTEM_STATUS
    title: str = ""
    body: str = ""
    priority: NotificationPriority = NotificationPriority.MEDIUM
    channels: list[NotificationChannel] = field(default_factory=list)
    data: dict[str, Any] = field(default_factory=dict)
    actions: list[dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    sent_at: Optional[datetime] = None
    status: NotificationStatus = NotificationStatus.PENDING
    requires_ack: bool = False
    ack_timeout_seconds: int = 300
    
    @property
    def is_critical(self) -> bool:
        return self.priority in [NotificationPriority.CRITICAL, NotificationPriority.HIGH]


NOTIFICATION_PRIORITIES = {
    NotificationType.CRITICAL_ALERT: {
        "channels": [NotificationChannel.FEISHU, NotificationChannel.TELEGRAM],
        "immediate": True,
        "require_ack": True,
        "retry_count": 3,
        "retry_interval_seconds": 60,
    },
    NotificationType.SECURITY_WARNING: {
        "channels": [NotificationChannel.FEISHU, NotificationChannel.TELEGRAM],
        "immediate": True,
        "require_ack": False,
        "retry_count": 2,
    },
    NotificationType.APPROVAL_REQUEST: {
        "channels": [NotificationChannel.FEISHU, NotificationChannel.TELEGRAM],
        "immediate": True,
        "require_ack": True,
        "timeout_seconds": 300,
    },
    NotificationType.EXECUTION_UPDATE: {
        "channels": [NotificationChannel.FEISHU],
        "immediate": False,
        "batch_interval_seconds": 60,
    },
    NotificationType.SYSTEM_STATUS: {
        "channels": [NotificationChannel.FEISHU],
        "immediate": False,
        "schedule": "0 */4 * * *",
    },
    NotificationType.DAILY_SUMMARY: {
        "channels": [NotificationChannel.FEISHU],
        "immediate": False,
        "schedule": "0 9 * * *",
    },
}
