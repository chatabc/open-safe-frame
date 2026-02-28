"""Permission manager implementation."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

from open_safe_frame.core.context import SecurityContext
from open_safe_frame.core.models import Action, Permission, PermissionLevel
from open_safe_frame.core.results import CheckResult, ValidationResult
from open_safe_frame.execution.permission.permission_model import (
    GrantedPermission,
    LEVEL_REQUIREMENTS,
    PermissionRequest,
    PermissionState,
)


@dataclass
class GrantResult:
    success: bool
    permission: Optional[GrantedPermission] = None
    error: str = ""
    requires_approval: bool = False


@dataclass
class RevokeResult:
    success: bool
    permission_id: str = ""
    reason: str = ""


class PermissionManager:
    def __init__(self):
        self._granted_permissions: dict[str, GrantedPermission] = {}
        self._pending_requests: dict[str, PermissionRequest] = {}
        self._user_permissions: dict[str, list[str]] = {}
    
    def check_permission(
        self,
        action: Action,
        context: SecurityContext,
    ) -> ValidationResult:
        checks = []
        errors = []
        
        required_level = action.required_permission_level
        user_permissions = context.get_user_permissions()
        trust_score = context.get_trust_score()
        
        level_req = LEVEL_REQUIREMENTS.get(required_level, {})
        trust_threshold = level_req.get("trust_threshold", 0.0)
        
        trust_check = CheckResult(
            passed=trust_score >= trust_threshold,
            check_name="trust_score_check",
            reason=f"信任评分: {trust_score:.2f}, 要求: {trust_threshold:.2f}",
            details={"trust_score": trust_score, "required": trust_threshold},
        )
        checks.append(trust_check)
        
        if not trust_check.passed:
            errors.append(f"信任评分不足: {trust_score:.2f} < {trust_threshold:.2f}")
        
        permission_name = f"action_{action.action_type}"
        has_permission = permission_name in user_permissions or self._has_level_permission(
            context.user.user_id if context.user else "",
            required_level,
        )
        
        permission_check = CheckResult(
            passed=has_permission,
            check_name="permission_check",
            reason=f"权限检查: {permission_name}",
            details={"has_permission": has_permission, "required_level": required_level.value},
        )
        checks.append(permission_check)
        
        if not has_permission:
            errors.append(f"缺少必要权限: {permission_name}")
        
        return ValidationResult(
            valid=len(errors) == 0,
            checks=checks,
            errors=errors,
        )
    
    def request_permission(
        self,
        user_id: str,
        permission_name: str,
        level: PermissionLevel,
        reason: str = "",
        scope: Optional[list[str]] = None,
    ) -> PermissionRequest:
        request = PermissionRequest(
            user_id=user_id,
            permission_name=permission_name,
            requested_level=level,
            reason=reason,
            scope=scope or [],
        )
        
        self._pending_requests[request.id] = request
        
        return request
    
    def grant_permission(
        self,
        request: PermissionRequest,
        granted_by: str,
        duration_hours: int = 24,
    ) -> GrantResult:
        level_req = LEVEL_REQUIREMENTS.get(request.requested_level, {})
        
        if level_req.get("needs_approval", False):
            return GrantResult(
                success=False,
                requires_approval=True,
                error="此权限级别需要审批",
            )
        
        permission = GrantedPermission(
            user_id=request.user_id,
            permission_name=request.permission_name,
            level=request.requested_level,
            scope=request.scope,
            granted_by=granted_by,
            expires_at=datetime.now() + timedelta(hours=duration_hours),
        )
        
        self._granted_permissions[permission.id] = permission
        
        if request.user_id not in self._user_permissions:
            self._user_permissions[request.user_id] = []
        self._user_permissions[request.user_id].append(permission.id)
        
        if request.id in self._pending_requests:
            del self._pending_requests[request.id]
        
        return GrantResult(success=True, permission=permission)
    
    def grant_with_approval(
        self,
        request_id: str,
        approved_by: str,
        duration_hours: int = 24,
    ) -> GrantResult:
        request = self._pending_requests.get(request_id)
        if not request:
            return GrantResult(success=False, error="请求不存在")
        
        permission = GrantedPermission(
            user_id=request.user_id,
            permission_name=request.permission_name,
            level=request.requested_level,
            scope=request.scope,
            granted_by=approved_by,
            expires_at=datetime.now() + timedelta(hours=duration_hours),
        )
        
        self._granted_permissions[permission.id] = permission
        
        if request.user_id not in self._user_permissions:
            self._user_permissions[request.user_id] = []
        self._user_permissions[request.user_id].append(permission.id)
        
        del self._pending_requests[request_id]
        
        return GrantResult(success=True, permission=permission)
    
    def revoke_permission(
        self,
        permission_id: str,
        reason: str = "",
    ) -> RevokeResult:
        permission = self._granted_permissions.get(permission_id)
        if not permission:
            return RevokeResult(success=False, reason="权限不存在")
        
        permission.status = PermissionState.REVOKED
        
        user_perms = self._user_permissions.get(permission.user_id, [])
        if permission_id in user_perms:
            user_perms.remove(permission_id)
        
        return RevokeResult(success=True, permission_id=permission_id, reason=reason)
    
    def revoke_all_permissions(self, user_id: str) -> list[RevokeResult]:
        results = []
        permission_ids = self._user_permissions.get(user_id, []).copy()
        
        for perm_id in permission_ids:
            result = self.revoke_permission(perm_id, "批量撤销")
            results.append(result)
        
        return results
    
    def get_user_permissions(self, user_id: str) -> list[GrantedPermission]:
        permission_ids = self._user_permissions.get(user_id, [])
        permissions = []
        
        for perm_id in permission_ids:
            perm = self._granted_permissions.get(perm_id)
            if perm and perm.is_valid:
                permissions.append(perm)
        
        return permissions
    
    def get_pending_requests(self) -> list[PermissionRequest]:
        return list(self._pending_requests.values())
    
    def _has_level_permission(self, user_id: str, required_level: PermissionLevel) -> bool:
        permissions = self.get_user_permissions(user_id)
        
        for perm in permissions:
            if perm.level.value >= required_level.value:
                return True
        
        return False
