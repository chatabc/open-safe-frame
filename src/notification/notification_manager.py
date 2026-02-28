"""Notification manager implementation."""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from open_safe_frame.notification.models import (
    NOTIFICATION_PRIORITIES,
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
)


@dataclass
class SendResult:
    success: bool
    notification_id: str = ""
    channel: Optional[NotificationChannel] = None
    error: str = ""
    sent_at: Optional[datetime] = None


@dataclass
class BroadcastResult:
    notification_id: str
    results: list[SendResult] = field(default_factory=list)
    
    @property
    def all_success(self) -> bool:
        return all(r.success for r in self.results)
    
    @property
    def success_count(self) -> int:
        return sum(1 for r in self.results if r.success)


class NotificationChannelBase:
    def __init__(self, config: Optional[dict[str, Any]] = None):
        self.config = config or {}
    
    async def send(self, notification: Notification) -> SendResult:
        raise NotImplementedError
    
    def format_message(self, notification: Notification) -> dict[str, Any]:
        raise NotImplementedError


class NotificationManager:
    def __init__(self):
        self._channels: dict[NotificationChannel, NotificationChannelBase] = {}
        self._sent_notifications: dict[str, Notification] = {}
        self._pending_queue: list[Notification] = []
    
    def register_channel(
        self,
        channel_type: NotificationChannel,
        channel: NotificationChannelBase,
    ) -> None:
        self._channels[channel_type] = channel
    
    def create_notification(
        self,
        notification_type: NotificationType,
        title: str,
        body: str,
        data: Optional[dict[str, Any]] = None,
        actions: Optional[list[dict[str, Any]]] = None,
    ) -> Notification:
        priority_config = NOTIFICATION_PRIORITIES.get(notification_type, {})
        
        return Notification(
            notification_type=notification_type,
            title=title,
            body=body,
            channels=priority_config.get("channels", [NotificationChannel.FEISHU]),
            data=data or {},
            actions=actions or [],
            requires_ack=priority_config.get("require_ack", False),
        )
    
    async def send_notification(
        self,
        notification: Notification,
    ) -> SendResult:
        if not notification.channels:
            return SendResult(
                success=False,
                notification_id=notification.id,
                error="No channels specified",
            )
        
        channel_type = notification.channels[0]
        channel = self._channels.get(channel_type)
        
        if not channel:
            return SendResult(
                success=False,
                notification_id=notification.id,
                channel=channel_type,
                error=f"Channel {channel_type.value} not registered",
            )
        
        result = await channel.send(notification)
        
        if result.success:
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
            self._sent_notifications[notification.id] = notification
        
        return result
    
    async def broadcast(
        self,
        notification: Notification,
        channels: Optional[list[NotificationChannel]] = None,
    ) -> BroadcastResult:
        target_channels = channels or notification.channels
        results = []
        
        tasks = []
        for channel_type in target_channels:
            channel = self._channels.get(channel_type)
            if channel:
                tasks.append(self._send_to_channel(channel, notification, channel_type))
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            results = [
                r if isinstance(r, SendResult) else SendResult(
                    success=False,
                    notification_id=notification.id,
                    error=str(r),
                )
                for r in results
            ]
        
        if any(r.success for r in results):
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
            self._sent_notifications[notification.id] = notification
        
        return BroadcastResult(
            notification_id=notification.id,
            results=results,
        )
    
    async def _send_to_channel(
        self,
        channel: NotificationChannelBase,
        notification: Notification,
        channel_type: NotificationChannel,
    ) -> SendResult:
        try:
            result = await channel.send(notification)
            result.channel = channel_type
            return result
        except Exception as e:
            return SendResult(
                success=False,
                notification_id=notification.id,
                channel=channel_type,
                error=str(e),
            )
    
    def get_notification(self, notification_id: str) -> Optional[Notification]:
        return self._sent_notifications.get(notification_id)
    
    def get_sent_notifications(self) -> list[Notification]:
        return list(self._sent_notifications.values())
