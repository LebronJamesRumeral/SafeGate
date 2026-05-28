from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from services.push_notifications import (
    get_vapid_public_key,
    register_subscription,
    remove_subscription,
    send_push_to_roles,
)


router = APIRouter(prefix='/api', tags=['notifications'])


class RoleNotificationCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=2000)
    targetRoles: List[str] = Field(default_factory=list)
    createdBy: Optional[str] = None
    relatedEventId: Optional[int] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class PushSubscribeRequest(BaseModel):
    subscription: Dict[str, Any]
    roles: List[str] = Field(default_factory=list)
    user_id: Optional[str] = None


class PushUnsubscribeRequest(BaseModel):
    endpoint: str = Field(..., min_length=1)


@router.get('/push/public-key')
def get_public_key() -> dict[str, str]:
    return {'publicKey': get_vapid_public_key()}


@router.post('/push/subscribe')
def subscribe(request: PushSubscribeRequest) -> dict[str, bool]:
    success = register_subscription(request.subscription, request.roles, request.user_id)
    if not success:
        raise HTTPException(status_code=400, detail='Invalid push subscription')

    return {'success': True}


@router.delete('/push/subscribe')
def unsubscribe(request: PushUnsubscribeRequest) -> dict[str, bool]:
    return {'success': remove_subscription(request.endpoint)}


@router.post('/notifications/role')
def create_role_notification(request: RoleNotificationCreateRequest) -> dict[str, bool]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail='Supabase is not configured')

    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    payload = {
        'title': request.title,
        'message': request.message,
        'target_roles': request.targetRoles,
        'created_by': request.createdBy or 'system',
        'related_event_id': request.relatedEventId,
        'meta': request.meta or {},
    }

    result = supabase.table('role_notifications').insert(payload).execute()
    if getattr(result, 'error', None):
        raise HTTPException(status_code=400, detail=str(result.error))

    send_push_to_roles(
        request.title,
        request.message,
        request.targetRoles,
        request.meta,
    )

    return {'success': True}
