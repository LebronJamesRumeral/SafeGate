from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
except ImportError:  # pragma: no cover - fallback for minimal environments
    serialization = None  # type: ignore[assignment]
    ec = None  # type: ignore[assignment]


DATA_DIR = Path(__file__).resolve().parents[1] / 'data'
SUBSCRIPTIONS_FILE = DATA_DIR / 'push_subscriptions.json'
VAPID_PUBLIC_FILE = DATA_DIR / 'vapid_public.key'
VAPID_PRIVATE_FILE = DATA_DIR / 'vapid_private.pem'


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read_json_file(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    try:
        content = path.read_text(encoding='utf-8').strip()
        if not content:
            return []
        loaded = json.loads(content)
        return loaded if isinstance(loaded, list) else []
    except Exception:
        return []


def _write_json_file(path: Path, payload: list[dict[str, Any]]) -> None:
    _ensure_data_dir()
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')


def _load_subscription_store() -> list[dict[str, Any]]:
    return _read_json_file(SUBSCRIPTIONS_FILE)


def _save_subscription_store(subscriptions: list[dict[str, Any]]) -> None:
    _write_json_file(SUBSCRIPTIONS_FILE, subscriptions)


def _normalize_role(role: Optional[str]) -> str:
    return role.strip().lower() if isinstance(role, str) else ''


def _normalize_roles(roles: Iterable[str]) -> list[str]:
    normalized: list[str] = []
    for role in roles:
        value = _normalize_role(role)
        if value and value not in normalized:
            normalized.append(value)
    return normalized


def _generate_vapid_keypair() -> tuple[str, str]:
    if ec is None or serialization is None:
        raise RuntimeError('cryptography is required to generate VAPID keys')

    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode('utf-8')
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_key = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
    return public_key, private_pem


def get_vapid_keys() -> tuple[str, str]:
    env_public = os.getenv('VAPID_PUBLIC_KEY', '').strip()
    env_private = os.getenv('VAPID_PRIVATE_KEY', '').strip()
    if env_public and env_private:
        return env_public, env_private

    _ensure_data_dir()
    if VAPID_PUBLIC_FILE.exists() and VAPID_PRIVATE_FILE.exists():
        return (
            VAPID_PUBLIC_FILE.read_text(encoding='utf-8').strip(),
            VAPID_PRIVATE_FILE.read_text(encoding='utf-8').strip(),
        )

    public_key, private_key = _generate_vapid_keypair()
    VAPID_PUBLIC_FILE.write_text(public_key, encoding='utf-8')
    VAPID_PRIVATE_FILE.write_text(private_key, encoding='utf-8')
    return public_key, private_key


def get_vapid_public_key() -> str:
    public_key, _ = get_vapid_keys()
    return public_key


def get_vapid_subject() -> str:
    subject = os.getenv('VAPID_SUBJECT', '').strip()
    return subject or 'mailto:admin@safegate.local'


def register_subscription(subscription: Dict[str, Any], roles: Iterable[str], user_id: Optional[str] = None) -> bool:
    endpoint = str(subscription.get('endpoint', '')).strip()
    if not endpoint:
        return False

    normalized_roles = _normalize_roles(roles)
    subscriptions = _load_subscription_store()
    next_subscriptions: list[dict[str, Any]] = []
    replaced = False

    for item in subscriptions:
        if item.get('endpoint') == endpoint:
            item = {
                **item,
                'subscription': subscription,
                'roles': normalized_roles,
                'user_id': user_id or item.get('user_id'),
            }
            replaced = True
        next_subscriptions.append(item)

    if not replaced:
        next_subscriptions.append(
            {
                'endpoint': endpoint,
                'subscription': subscription,
                'roles': normalized_roles,
                'user_id': user_id,
            }
        )

    _save_subscription_store(next_subscriptions)
    return True


def remove_subscription(endpoint: str) -> bool:
    normalized_endpoint = endpoint.strip()
    if not normalized_endpoint:
        return False

    subscriptions = _load_subscription_store()
    filtered = [item for item in subscriptions if item.get('endpoint') != normalized_endpoint]
    _save_subscription_store(filtered)
    return len(filtered) != len(subscriptions)


def _subscription_matches_roles(subscription: dict[str, Any], target_roles: Iterable[str]) -> bool:
    stored_roles = set(_normalize_roles(subscription.get('roles', [])))
    requested_roles = set(_normalize_roles(target_roles))
    return bool(stored_roles.intersection(requested_roles))


def _resolve_notification_href(title: str, target_roles: Iterable[str], meta: Optional[Dict[str, Any]]) -> str:
    notification_meta = meta or {}
    explicit_href = str(notification_meta.get('href', '') or '').strip()
    if explicit_href:
        return explicit_href

    normalized_title = title.lower()
    normalized_roles = {role.lower() for role in target_roles}

    if 'weekly check-in' in normalized_title:
        return '/parent-behavior'
    if 'school event' in normalized_title:
        return '/parent-announcement'
    if 'reviewed by guidance' in normalized_title:
        return '/parent-behavior' if 'parent' in normalized_roles else '/behavioral-events'

    return '/'


def _build_payload(title: str, message: str, target_roles: Iterable[str], meta: Optional[Dict[str, Any]] = None) -> dict[str, Any]:
    href = _resolve_notification_href(title, target_roles, meta)
    return {
        'title': title,
        'body': message,
        'href': href,
        'icon': '/SGCDC.png',
        'badge': '/SGCDC.png',
        'tag': meta.get('notification_kind') if isinstance(meta, dict) else None,
    }


def _send_web_push(subscription: dict[str, Any], payload: dict[str, Any]) -> bool:
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        return False

    _, private_key = get_vapid_keys()
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=private_key,
            vapid_claims={
                'sub': get_vapid_subject(),
            },
        )
        return True
    except WebPushException as error:
        response = getattr(error, 'response', None)
        status_code = getattr(response, 'status_code', None)
        if status_code in {404, 410}:
            remove_subscription(str(subscription.get('endpoint', '')))
        return False
    except Exception:
        return False


def send_push_to_roles(title: str, message: str, target_roles: Iterable[str], meta: Optional[Dict[str, Any]] = None) -> int:
    subscriptions = _load_subscription_store()
    if not subscriptions:
        return 0

    payload = _build_payload(title, message, target_roles, meta)
    delivered = 0
    for item in subscriptions:
        subscription = item.get('subscription')
        if not isinstance(subscription, dict):
            continue
        if not _subscription_matches_roles(item, target_roles):
            continue
        if _send_web_push(subscription, payload):
            delivered += 1

    return delivered
