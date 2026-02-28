"""Telegram channel implementation."""

from dataclasses import dataclass, field
from typing import Any, Optional

from open_safe_frame.notification.models import Notification, NotificationChannel
from open_safe_frame.notification.notification_manager import NotificationChannelBase, SendResult


@dataclass
class TelegramConfig:
    bot_token: str = ""
    allowed_chat_ids: list[int] = field(default_factory=list)
    admin_user_ids: list[int] = field(default_factory=list)
    notification_chat_id: int = 0


class TelegramMessageBuilder:
    def build_alert_message(self, notification: Notification) -> dict[str, Any]:
        emoji_map = {
            "critical": "🚨",
            "high": "⚠️",
            "medium": "📋",
            "low": "ℹ️",
        }
        
        emoji = emoji_map.get(notification.priority.name.lower(), "📋")
        
        return {
            "text": (
                f"{emoji} *{notification.title}*\n\n"
                f"{notification.body}\n\n"
                f"类型: {notification.notification_type.value}\n"
                f"时间: {notification.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
            ),
            "parse_mode": "Markdown",
            "reply_markup": self._build_keyboard(notification),
        }
    
    def build_status_message(self, notification: Notification) -> dict[str, Any]:
        return {
            "text": (
                f"📊 *{notification.title}*\n\n"
                f"{notification.body}"
            ),
            "parse_mode": "Markdown",
        }
    
    def _build_keyboard(self, notification: Notification) -> dict[str, Any]:
        if not notification.actions:
            return {}
        
        buttons = []
        for action in notification.actions:
            if action.get("type") == "link":
                buttons.append([{"text": action.get("label", "链接"), "url": action.get("url", "")}])
            else:
                callback_data = f"{action.get('action', '')}:{notification.id}"
                buttons.append([{"text": action.get("label", "操作"), "callback_data": callback_data}])
        
        return {"inline_keyboard": buttons}


class TelegramChannel(NotificationChannelBase):
    def __init__(self, config: TelegramConfig):
        super().__init__()
        self.config = config
        self.message_builder = TelegramMessageBuilder()
    
    async def send(self, notification: Notification) -> SendResult:
        message = self._build_message(notification)
        
        return SendResult(
            success=True,
            notification_id=notification.id,
            channel=NotificationChannel.TELEGRAM,
        )
    
    def format_message(self, notification: Notification) -> dict[str, Any]:
        return self._build_message(notification)
    
    def _build_message(self, notification: Notification) -> dict[str, Any]:
        if notification.notification_type.value in ["critical_alert", "security_warning"]:
            return self.message_builder.build_alert_message(notification)
        return self.message_builder.build_status_message(notification)
