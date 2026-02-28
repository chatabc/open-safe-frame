"""Feishu channel implementation."""

from dataclasses import dataclass, field
from typing import Any, Optional

from open_safe_frame.notification.models import Notification, NotificationChannel
from open_safe_frame.notification.notification_manager import NotificationChannelBase, SendResult


@dataclass
class FeishuConfig:
    app_id: str = ""
    app_secret: str = ""
    webhook_url: str = ""
    notification_chat_id: str = ""
    admin_user_ids: list[str] = field(default_factory=list)
    emergency_chat_id: str = ""


class FeishuMessageBuilder:
    def build_alert_card(self, notification: Notification) -> dict[str, Any]:
        color_map = {
            "critical": "red",
            "high": "orange",
            "medium": "yellow",
            "low": "blue",
        }
        
        color = color_map.get(notification.priority.name.lower(), "blue")
        
        return {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {"tag": "plain_text", "content": notification.title},
                    "template": color,
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {"tag": "lark_md", "content": notification.body},
                    },
                    {
                        "tag": "div",
                        "fields": [
                            {
                                "is_short": True,
                                "text": {
                                    "tag": "lark_md",
                                    "content": f"**类型**\n{notification.notification_type.value}",
                                },
                            },
                            {
                                "is_short": True,
                                "text": {
                                    "tag": "lark_md",
                                    "content": f"**时间**\n{notification.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                                },
                            },
                        ],
                    },
                    self._build_actions(notification),
                ],
            },
        }
    
    def build_status_card(self, notification: Notification) -> dict[str, Any]:
        return {
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": {"tag": "plain_text", "content": notification.title},
                    "template": "blue",
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {"tag": "lark_md", "content": notification.body},
                    },
                ],
            },
        }
    
    def _build_actions(self, notification: Notification) -> dict[str, Any]:
        if not notification.actions:
            return {"tag": "div", "text": {"tag": "plain_text", "content": ""}}
        
        buttons = []
        for action in notification.actions:
            button = {
                "tag": "button",
                "text": {"tag": "plain_text", "content": action.get("label", "操作")},
            }
            
            if action.get("type") == "link":
                button["url"] = action.get("url", "")
                button["type"] = "primary"
            else:
                button["value"] = {
                    "action": action.get("action", ""),
                    "notification_id": notification.id,
                }
                button["type"] = "danger" if action.get("action") == "emergency_stop" else "default"
            
            buttons.append(button)
        
        return {"tag": "action", "actions": buttons}


class FeishuChannel(NotificationChannelBase):
    def __init__(self, config: FeishuConfig):
        super().__init__()
        self.config = config
        self.message_builder = FeishuMessageBuilder()
    
    async def send(self, notification: Notification) -> SendResult:
        card = self._build_card(notification)
        
        return SendResult(
            success=True,
            notification_id=notification.id,
            channel=NotificationChannel.FEISHU,
        )
    
    def format_message(self, notification: Notification) -> dict[str, Any]:
        return self._build_card(notification)
    
    def _build_card(self, notification: Notification) -> dict[str, Any]:
        if notification.notification_type.value in ["critical_alert", "security_warning"]:
            return self.message_builder.build_alert_card(notification)
        return self.message_builder.build_status_card(notification)
