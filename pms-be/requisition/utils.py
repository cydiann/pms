from typing import Iterable

PURCHASING_GROUP_NAMES: Iterable[str] = ['Purchasing Team', 'Purchasing', 'Procurement']


def user_can_purchase(user) -> bool:
    """
    Determine whether the given user should be treated as part of the purchasing team.
    Falls back to group membership and explicit permissions since the User model
    does not expose a dedicated role attribute.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True

    purchasing_perms = (
        'requisition.view_purchasing_queue',
        'requisition.mark_ordered',
        'requisition.mark_delivered',
        'requisition.complete_request',
    )
    if any(user.has_perm(code) for code in purchasing_perms):
        return True

    return user.groups.filter(name__in=PURCHASING_GROUP_NAMES).exists()
