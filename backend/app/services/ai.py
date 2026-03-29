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

    @property
    def client(self):
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def moderate_content(self, text: str) -> bool:
        """
        Check if content is allowed.
        Returns True if allowed (PASS), False if blocked (BLOCK).
        """
        if not self.enabled or not self.api_key:
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
                logger.warning(f"AI Content Moderation: BLOCKED message: {text}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"AI Moderation Error: {e}")
            # On error, we default to PASS to not break chat, but log it
            return True

ai_service = AIService()
