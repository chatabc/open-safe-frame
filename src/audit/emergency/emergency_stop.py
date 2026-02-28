"""Emergency stop implementation."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4


class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class StopResult:
    success: bool
    stop_id: str = field(default_factory=lambda: str(uuid4()))
    reason: str = ""
    stopped_executions: list[str] = field(default_factory=list)
    revoked_permissions: list[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)


class EmergencyStop:
    STOP_CONDITIONS = [
        "harm_to_humans_detected",
        "critical_constraint_violation",
        "unauthorized_safety_modification",
        "runaway_behavior_detected",
        "external_stop_signal",
    ]
    
    def __init__(self):
        self._is_stopped = False
        self._stop_history: list[StopResult] = []
        self._executions: dict[str, any] = {}
        self._permissions: dict[str, any] = {}
    
    def trigger(self, reason: str, severity: Severity) -> StopResult:
        result = StopResult(reason=reason)
        
        result.stopped_executions = self.stop_all_executions()
        result.revoked_permissions = self.revoke_all_permissions()
        
        self._is_stopped = True
        self._stop_history.append(result)
        
        self.notify_administrators(reason, severity)
        self.initiate_investigation(reason)
        
        result.success = True
        return result
    
    def stop_all_executions(self) -> list[str]:
        execution_ids = list(self._executions.keys())
        self._executions.clear()
        return execution_ids
    
    def revoke_all_permissions(self) -> list[str]:
        permission_ids = list(self._permissions.keys())
        self._permissions.clear()
        return permission_ids
    
    def notify_administrators(self, reason: str, severity: Severity) -> None:
        pass
    
    def initiate_investigation(self, reason: str) -> None:
        pass
    
    def is_stopped(self) -> bool:
        return self._is_stopped
    
    def resume(self) -> None:
        self._is_stopped = False
    
    def get_stop_history(self) -> list[StopResult]:
        return self._stop_history.copy()
    
    def register_execution(self, execution_id: str, execution: any) -> None:
        self._executions[execution_id] = execution
    
    def unregister_execution(self, execution_id: str) -> None:
        if execution_id in self._executions:
            del self._executions[execution_id]
    
    def register_permission(self, permission_id: str, permission: any) -> None:
        self._permissions[permission_id] = permission
    
    def unregister_permission(self, permission_id: str) -> None:
        if permission_id in self._permissions:
            del self._permissions[permission_id]
