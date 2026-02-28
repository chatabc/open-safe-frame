"""Remote emergency stop implementation."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4


@dataclass
class EmergencyStopResult:
    success: bool
    stop_id: str = field(default_factory=lambda: str(uuid4()))
    stopped_executions: int = 0
    revoked_permissions: int = 0
    error: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


class RemoteEmergencyStop:
    STOP_CONDITIONS = [
        "harm_to_humans_detected",
        "critical_constraint_violation",
        "unauthorized_safety_modification",
        "runaway_behavior_detected",
        "external_stop_signal",
    ]
    
    def __init__(self):
        self._is_stopped = False
        self._stop_history: list[dict] = []
        self._on_stop_handlers: list[callable] = []
        self._execution_manager = None
        self._permission_manager = None
    
    def set_execution_manager(self, manager: any) -> None:
        self._execution_manager = manager
    
    def set_permission_manager(self, manager: any) -> None:
        self._permission_manager = manager
    
    def register_on_stop(self, handler: callable) -> None:
        self._on_stop_handlers.append(handler)
    
    async def trigger_from_remote(
        self,
        user_id: str,
        reason: str,
        source: str,
    ) -> EmergencyStopResult:
        if not self._verify_user_permission(user_id):
            return EmergencyStopResult(
                success=False,
                error="Permission denied",
            )
        
        return await self.trigger(
            reason=f"Remote trigger by {user_id} via {source}: {reason}",
            severity="high",
        )
    
    async def trigger(
        self,
        reason: str,
        severity: str = "high",
    ) -> EmergencyStopResult:
        result = EmergencyStopResult()
        
        try:
            stopped = await self._stop_all_executions()
            result.stopped_executions = stopped
            
            revoked = await self._revoke_all_permissions()
            result.revoked_permissions = revoked
            
            self._is_stopped = True
            
            self._record_stop(reason, severity, result)
            
            await self._notify_handlers(reason, severity)
            
            result.success = True
        except Exception as e:
            result.error = str(e)
        
        return result
    
    async def confirm_stop(self, confirmation_token: str) -> bool:
        return True
    
    def is_stopped(self) -> bool:
        return self._is_stopped
    
    def resume(self) -> None:
        self._is_stopped = False
    
    def get_stop_history(self) -> list[dict]:
        return self._stop_history.copy()
    
    def _verify_user_permission(self, user_id: str) -> bool:
        return True
    
    async def _stop_all_executions(self) -> int:
        if self._execution_manager:
            return await self._execution_manager.stop_all()
        return 0
    
    async def _revoke_all_permissions(self) -> int:
        if self._permission_manager:
            return await self._permission_manager.revoke_all()
        return 0
    
    def _record_stop(self, reason: str, severity: str, result: EmergencyStopResult) -> None:
        self._stop_history.append({
            "stop_id": result.stop_id,
            "reason": reason,
            "severity": severity,
            "stopped_executions": result.stopped_executions,
            "revoked_permissions": result.revoked_permissions,
            "timestamp": result.timestamp.isoformat(),
        })
    
    async def _notify_handlers(self, reason: str, severity: str) -> None:
        for handler in self._on_stop_handlers:
            try:
                if asyncio.iscoroutine(handler):
                    await handler(reason, severity)
                else:
                    handler(reason, severity)
            except Exception:
                pass


import asyncio
