"""Sandbox execution environment."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import uuid4


class IsolationLevel(Enum):
    NONE = "none"
    BASIC = "basic"
    STANDARD = "standard"
    STRICT = "strict"


@dataclass
class ResourceLimits:
    cpu_quota: float = 0.5
    memory_max: str = "512M"
    io_bps: str = "10M"
    network_enabled: bool = False
    file_access: str = "readonly"


@dataclass
class MonitoringConfig:
    syscall_tracing: bool = True
    network_monitoring: bool = True
    file_monitoring: bool = True
    behavior_logging: bool = True


@dataclass
class SandboxConfig:
    resource_limits: ResourceLimits = field(default_factory=ResourceLimits)
    isolation_level: IsolationLevel = IsolationLevel.STANDARD
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    timeout_seconds: int = 300


@dataclass
class Sandbox:
    id: str = field(default_factory=lambda: str(uuid4()))
    config: SandboxConfig = field(default_factory=SandboxConfig)
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "created"
    execution_count: int = 0
    resource_usage: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionResult:
    success: bool
    output: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    resource_usage: dict[str, Any] = field(default_factory=dict)
    violations: list[str] = field(default_factory=list)


class SandboxManager:
    def __init__(self):
        self._sandboxes: dict[str, Sandbox] = {}
        self._active_executions: dict[str, str] = {}
    
    def create_sandbox(self, config: Optional[SandboxConfig] = None) -> Sandbox:
        sandbox = Sandbox(config=config or SandboxConfig())
        self._sandboxes[sandbox.id] = sandbox
        return sandbox
    
    def execute_in_sandbox(
        self,
        action_id: str,
        sandbox: Sandbox,
        execution_func: callable,
        *args,
        **kwargs,
    ) -> ExecutionResult:
        start_time = datetime.now()
        violations = []
        
        try:
            self._active_executions[action_id] = sandbox.id
            sandbox.status = "executing"
            sandbox.execution_count += 1
            
            output = execution_func(*args, **kwargs)
            
            sandbox.status = "idle"
            del self._active_executions[action_id]
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            return ExecutionResult(
                success=True,
                output=output,
                duration_ms=duration,
                resource_usage=sandbox.resource_usage,
            )
        except Exception as e:
            sandbox.status = "error"
            if action_id in self._active_executions:
                del self._active_executions[action_id]
            
            return ExecutionResult(
                success=False,
                error=str(e),
                violations=violations,
            )
    
    def destroy_sandbox(self, sandbox_id: str) -> bool:
        sandbox = self._sandboxes.get(sandbox_id)
        if not sandbox:
            return False
        
        for action_id, sb_id in list(self._active_executions.items()):
            if sb_id == sandbox_id:
                del self._active_executions[action_id]
        
        del self._sandboxes[sandbox_id]
        return True
    
    def get_sandbox(self, sandbox_id: str) -> Optional[Sandbox]:
        return self._sandboxes.get(sandbox_id)
    
    def list_sandboxes(self) -> list[Sandbox]:
        return list(self._sandboxes.values())
    
    def get_active_executions(self) -> dict[str, str]:
        return self._active_executions.copy()
