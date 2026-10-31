from enum import Enum

from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.user import User


class UserRole(str, Enum):

    ADMIN = "admin"

    SECURITY_ANALYST = "security_analyst"

    VIEWER = "viewer"


def require_roles(*allowed_roles: UserRole):

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:

        if current_user.role not in [
            role.value for role in allowed_roles
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_checker