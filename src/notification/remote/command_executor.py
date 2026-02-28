"""Remote command executor."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Optional
from uuid import uuid4


@dataclass
class RemoteCommand:
    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    user_id: str = ""
    source: str = ""
    args: dict[str, Any] = field(default_factory=dict)
    confirmed: bool = False
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class CommandResult:
    success: bool
    command_id: str = ""
    output: Any = None
    error: str = ""
    requires_confirmation: bool = False
    confirmation_message: str = ""


COMMAND_PERMISSIONS = {
    "emergency_stop": ["admin", "operator"],
    "resume_execution": ["admin"],
    "approve_action": ["admin", "approver"],
    "reject_action": ["admin", "approver"],
    "revoke_permission": ["admin"],
    "adjust_config": ["admin"],
    "view_status": ["admin", "operator", "viewer"],
    "view_logs": ["admin", "operator", "viewer"],
    "list_permissions": ["admin", "operator", "viewer"],
}


class RemoteCommandExecutor:
    def __init__(self):
        self._handlers: dict[str, Callable] = {}
        self._permission_checker: Optional[Callable] = None
        self._audit_logger: Optional[Callable] = None
        self._requires_confirmation: set[str] = {"emergency_stop", "revoke_permission", "adjust_config"}
    
    def register_command(
        self,
        name: str,
        handler: Callable,
        permissions: Optional[list[str]] = None,
    ) -> None:
        self._handlers[name] = handler
        if permissions:
            COMMAND_PERMISSIONS[name] = permissions
    
    def set_permission_checker(self, checker: Callable) -> None:
        self._permission_checker = checker
    
    def set_audit_logger(self, logger: Callable) -> None:
        self._audit_logger = logger
    
    async def execute(self, command: RemoteCommand) -> CommandResult:
        if not self._verify_permission(command):
            return CommandResult(
                success=False,
                command_id=command.id,
                error="Permission denied",
            )
        
        if command.name in self._requires_confirmation and not command.confirmed:
            return CommandResult(
                success=False,
                command_id=command.id,
                requires_confirmation=True,
                confirmation_message=self._get_confirmation_message(command),
            )
        
        handler = self._handlers.get(command.name)
        if not handler:
            return CommandResult(
                success=False,
                command_id=command.id,
                error=f"Unknown command: {command.name}",
            )
        
        try:
            result = await handler(command.args) if asyncio.iscoroutine(handler) else handler(command.args)
            
            self._audit(command, result)
            
            return CommandResult(
                success=True,
                command_id=command.id,
                output=result,
            )
        except Exception as e:
            return CommandResult(
                success=False,
                command_id=command.id,
                error=str(e),
            )
    
    def _verify_permission(self, command: RemoteCommand) -> bool:
        required_roles = COMMAND_PERMISSIONS.get(command.name, ["admin"])
        
        if self._permission_checker:
            return self._permission_checker(command.user_id, required_roles)
        
        return True
    
    def _get_confirmation_message(self, command: RemoteCommand) -> str:
        messages = {
            "emergency_stop": "⚠️ 确认执行紧急停止？这将停止所有正在执行的操作。",
            "revoke_permission": "⚠️ 确认撤销权限？此操作不可撤销。",
            "adjust_config": "⚠️ 确认修改配置？这可能影响系统运行。",
        }
        return messages.get(command.name, "确认执行此操作？")
    
    def _audit(self, command: RemoteCommand, result: Any) -> None:
        if self._audit_logger:
            self._audit_logger(command, result)
    
    def get_available_commands(self, user_roles: list[str]) -> list[str]:
        commands = []
        for cmd, roles in COMMAND_PERMISSIONS.items():
            if any(role in roles for role in user_roles):
                commands.append(cmd)
        return commands


import asyncio
