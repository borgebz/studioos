"""
Redis-backed invite tokens: ``invite:{token}`` → user id; ``invite_user:{user_id}`` → token.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

INVITE_TOKEN_SECONDS = 7 * 24 * 60 * 60

_redis_client = None


def _invite_key(token: str) -> str:
    return f"invite:{token}"


def _invite_user_key(user_id: int) -> str:
    return f"invite_user:{user_id}"


def get_redis_client():
    """Return the shared Redis client (lazy init)."""
    global _redis_client
    if _redis_client is None:
        import redis
        from django.conf import settings

        _redis_client = redis.Redis.from_url(
            settings.INVITE_REDIS_URL,
            decode_responses=True,
        )
    return _redis_client


def set_redis_client_for_tests(client):
    """Replace the Redis client (used by tests with fakeredis)."""
    global _redis_client
    _redis_client = client


def reset_redis_client():
    """Clear cached client (e.g. after tests)."""
    global _redis_client
    _redis_client = None


def store_invite_token(*, user_id: int, token: str) -> None:
    r = get_redis_client()
    pipe = r.pipeline()
    pipe.set(_invite_key(token), str(user_id), ex=INVITE_TOKEN_SECONDS)
    pipe.set(_invite_user_key(user_id), token, ex=INVITE_TOKEN_SECONDS)
    pipe.execute()


def revoke_invite_tokens_for_user(*, user_id: int) -> None:
    """Remove any stored invite token for this user (forward + reverse index)."""
    r = get_redis_client()
    old_token = r.get(_invite_user_key(user_id))
    pipe = r.pipeline()
    if old_token:
        pipe.delete(_invite_key(old_token))
    pipe.delete(_invite_user_key(user_id))
    pipe.execute()


def get_user_id_for_token(*, token: str) -> int | None:
    r = get_redis_client()
    raw = r.get(_invite_key(token))
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        logger.warning("invite_store: invalid user id in redis for token lookup")
        return None


def delete_invite_token_pair(*, user_id: int, token: str) -> None:
    r = get_redis_client()
    pipe = r.pipeline()
    pipe.delete(_invite_key(token))
    pipe.delete(_invite_user_key(user_id))
    pipe.execute()
