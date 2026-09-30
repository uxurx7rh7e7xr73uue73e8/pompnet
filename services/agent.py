import os
from typing import Any
import requests


class AgentError(Exception):
    pass


class AgentClient:
    """Read/write boundary for a small VPS agent connected to Sanaei/Xray.

    The Railway app never attempts to run Xray or modify a panel database directly.
    The agent must authenticate with X-API-Token and implement the documented routes.
    """
    def __init__(self):
        self.base_url = os.environ.get("AGENT_URL", "").rstrip("/")
        self.token = os.environ.get("AGENT_TOKEN", "")
        self.timeout = float(os.environ.get("AGENT_TIMEOUT", "8"))

    def _get(self, path: str, params: dict[str, Any] | None = None):
        if not self.base_url or not self.token:
            raise AgentError("VPS agent is not configured")
        try:
            response = requests.get(
                f"{self.base_url}{path}",
                params=params,
                headers={"X-API-Token": self.token, "Accept": "application/json"},
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            raise AgentError("VPS agent could not be reached") from exc

    def overview(self):
        return self._get("/v1/overview")

    def users(self, query):
        return self._get("/v1/users", params={k: v for k, v in query.items() if v})

    @staticmethod
    def empty_overview():
        return {"total_users": 0, "active_users": 0, "disabled_users": 0, "online_users": 0,
                "traffic_usage": 0, "expired_users": 0, "inbounds": 0,
                "server_status": "agent_offline"}
