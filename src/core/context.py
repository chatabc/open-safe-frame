"""Context management for Open Safe Frame."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class UserContext:
    user_id: str
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)
    trust_score: float = 0.0
    session_id: Optional[str] = None
    authenticated_at: datetime = field(default_factory=datetime.now)


@dataclass
class SystemContext:
    system_id: str
    version: str = "0.1.0"
    environment: str = "development"
    security_level: str = "standard"
    active_executions: int = 0
    risk_accumulation: float = 0.0


@dataclass
class SecurityContext:
    user: Optional[UserContext] = None
    system: Optional[SystemContext] = None
    session_data: dict[str, Any] = field(default_factory=dict)
    environment: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    def get_user_roles(self) -> list[str]:
        return self.user.roles if self.user else []
    
    def get_user_permissions(self) -> list[str]:
        return self.user.permissions if self.user else []
    
    def get_trust_score(self) -> float:
        return self.user.trust_score if self.user else 0.0
    
    def has_role(self, role: str) -> bool:
        return role in self.get_user_roles()
    
    def has_permission(self, permission: str) -> bool:
        return permission in self.get_user_permissions()


@dataclass
class ExecutionContext:
    execution_id: str
    action_id: str
    sandbox_id: Optional[str] = None
    started_at: datetime = field(default_factory=datetime.now)
    status: str = "pending"
    progress: float = 0.0
    checkpoints: list[dict[str, Any]] = field(default_factory=list)
    logs: list[str] = field(default_factory=list)
    
    def add_checkpoint(self, checkpoint: dict[str, Any]) -> None:
        checkpoint["timestamp"] = datetime.now().isoformat()
        self.checkpoints.append(checkpoint)
    
    def add_log(self, message: str) -> None:
        self.logs.append(f"[{datetime.now().isoformat()}] {message}")
    
    def update_progress(self, progress: float) -> None:
        self.progress = min(1.0, max(0.0, progress))
