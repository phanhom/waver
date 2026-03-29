import httpx
import logging
from typing import Optional
from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.api_base = settings.AI_API_BASE
        self.api_key = settings.AI_API_KEY
        self.model_name = settings.AI_MODEL_NAME
        self.enabled = settings.AI_ENABLED
        self._client = None
        self._logged_mode = False

    def _log_mode_once(self) -> None:
        if self._logged_mode:
            return
        self._logged_mode = True
        if not self.enabled:
            logger.info(
                "[AI moderation] OFF — set [ai] enabled = true in config.toml to enable LLM gate"
            )
        elif not (self.api_key or "").strip():
            logger.info(
                "[AI moderation] OFF — [ai] enabled but api_key is empty (no LLM calls)"
            )
        else:
            logger.info(
                "[AI moderation] ON — model=%s base=%s",
                self.model_name,
                self.api_base.rstrip("/"),
            )

    @property
    def client(self):
        if self._client is None:
            timeout = httpx.Timeout(settings.AI_TIMEOUT_SECONDS, connect=min(settings.AI_TIMEOUT_SECONDS, 5.0))
            self._client = httpx.AsyncClient(timeout=timeout, trust_env=settings.AI_TRUST_ENV)
        return self._client

    async def moderate_content(self, text: str) -> bool:
        """
        Check if content is allowed.
        Returns True if allowed (PASS), False if blocked (BLOCK).
        """
        if not self.enabled or not (self.api_key or "").strip():
            logger.debug("[AI moderation] skip (disabled or no api_key), message_len=%s", len(text))
            return True

        try:
            prompt = settings.AI_MODERATION_PROMPT + text
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model_name,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0
            }

            response = await self.client.post(
                f"{self.api_base.rstrip('/')}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()
            answer = result['choices'][0]['message']['content'].strip().upper()

            if "BLOCK" in answer:
                logger.warning(
                    "[AI moderation] BLOCK — model_reply=%r msg_preview=%r",
                    answer[:200],
                    text[:80] + ("..." if len(text) > 80 else ""),
                )
                return False

            logger.info(
                "[AI moderation] PASS — model_reply=%r msg_len=%s",
                answer[:120] + ("..." if len(answer) > 120 else ""),
                len(text),
            )
            return True
        except Exception as e:
            policy = "allow" if settings.AI_FAIL_OPEN else "block"
            logger.error(
                "[AI moderation] ERROR (policy=%s on failure): %s",
                policy,
                e,
                exc_info=True,
            )
            return bool(settings.AI_FAIL_OPEN)

ai_service = AIService()
ai_service._log_mode_once()
