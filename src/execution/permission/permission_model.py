"""Permission model definitions."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4


class PermissionState(Enum):
    GRANTED = "granted"
    REVOKED = "revoked"
    EXPIRED = "expired"
    PENDING = "pending"


class PermissionLevel(Enum):
    LEVEL_0 = 0
    LEVEL_1 = 1
    LEVEL_2 = 2
    LEVEL_3 = 3
    LEVEL_4 = 4


LEVEL_REQUIREMENTS = {
    PermissionLevel.LEVEL_0: {
        "trust_threshold": 0.0,
        "needs_approval": False,
        "description": "基础权限 - 读取公开信息，执行无害操作",
    },
    PermissionLevel.LEVEL_1: {
        "trust_threshold": 0.3,
        "needs_approval": False,
        "description": "标准权限 - 读取用户授权数据，执行标准操作",
    },
    PermissionLevel.LEVEL_2: {
        "trust_threshold": 0.5,
        "needs_approval": False,
        "description": "高级权限 - 修改用户数据，系统配置更改",
    },
    PermissionLevel.LEVEL_3: {
        "trust_threshold": 0.7,
        "needs_approval": True,
        "description": "特权权限 - 核心系统访问，安全策略调整",
    },
    PermissionLevel.LEVEL_4: {
        "trust_threshold": 0.9,
        "needs_approval": True,
        "time_lock_seconds": 300,
        "description": "关键权限 - 安全机制修改，价值对齐调整",
    },
}


@dataclass
class PermissionRequest:
    id: str = field(default_factory=lambda: str(uuid4()))
    user_id: str = ""
    permission_name: str = ""
    requested_level: PermissionLevel = PermissionLevel.LEVEL_0
    reason: str = ""
    scope: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    status: PermissionState = PermissionState.PENDING


@dataclass
class GrantedPermission:
    id: str = field(default_factory=lambda: str(uuid4()))
    user_id: str = ""
    permission_name: str = ""
    level: PermissionLevel = PermissionLevel.LEVEL_0
    scope: list[str] = field(default_factory=list)
    granted_at: datetime = field(default_factory=datetime.now)
    granted_by: str = ""
    expires_at: Optional[datetime] = None
    conditions: dict = field(default_factory=dict)
    status: PermissionState = PermissionState.GRANTED
    
    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        return self.status == PermissionState.GRANTED and not self.is_expired
