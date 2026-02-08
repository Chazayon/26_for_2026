"""LLM provider abstraction: OpenRouter and Ollama support."""
import httpx
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_community.chat_models import ChatOllama
from langchain_core.language_models import BaseChatModel
from sqlalchemy import select
from app.config import settings
from app.database import async_session, ModelConfig

_llm_cache: dict[tuple[str, str, float, int], BaseChatModel] = {}
_role_default_cache: dict[str, Optional[tuple[str, str, float, int]]] = {}


def get_openrouter_llm(model_id: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
    return ChatOpenAI(
        model=model_id,
        openai_api_key=settings.openrouter_api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=temperature,
        max_tokens=max_tokens,
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Novel Automation Studio",
        },
    )


def get_ollama_llm(model_id: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
    return ChatOllama(
        model=model_id,
        base_url=settings.ollama_base_url,
        temperature=temperature,
        num_predict=max_tokens,
    )


def get_llm(provider: str, model_id: str, temperature: float = 0.7, max_tokens: int = 4096) -> BaseChatModel:
    cache_key = (provider, model_id, temperature, max_tokens)
    cached = _llm_cache.get(cache_key)
    if cached is not None:
        return cached

    if provider == "openrouter":
        llm = get_openrouter_llm(model_id, temperature, max_tokens)
    elif provider == "ollama":
        llm = get_ollama_llm(model_id, temperature, max_tokens)
    else:
        raise ValueError(f"Unknown provider: {provider}")

    _llm_cache[cache_key] = llm
    return llm


def clear_model_config_cache():
    """Clear cached defaults and model instances after config changes."""
    _role_default_cache.clear()
    _llm_cache.clear()


async def get_llm_for_role(role: str, project_config: Optional[dict] = None) -> BaseChatModel:
    """Get the LLM configured for a specific agent role.
    
    Checks project-level overrides first, then falls back to global defaults.
    """
    if project_config and role in project_config:
        cfg = project_config[role]
        return get_llm(
            provider=cfg["provider"],
            model_id=cfg["model_id"],
            temperature=float(cfg.get("temperature", 0.7)),
            max_tokens=int(cfg.get("max_tokens", 4096)),
        )

    default_cfg = _role_default_cache.get(role)
    if role not in _role_default_cache:
        async with async_session() as session:
            result = await session.execute(
                select(ModelConfig).where(
                    ModelConfig.role == role,
                    ModelConfig.is_default == 1,
                )
            )
            config = result.scalar_one_or_none()
            if config is None:
                _role_default_cache[role] = None
            else:
                _role_default_cache[role] = (
                    config.provider,
                    config.model_id,
                    float(config.temperature),
                    config.max_tokens,
                )
        default_cfg = _role_default_cache.get(role)

    if default_cfg is None:
        return get_llm("openrouter", "anthropic/claude-sonnet-4", 0.7, 4096)

    provider, model_id, temperature, max_tokens = default_cfg
    return get_llm(
        provider=provider,
        model_id=model_id,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def list_ollama_models() -> list[dict]:
    """Fetch available models from local Ollama instance."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {"id": m["name"], "name": m["name"], "size": m.get("size", 0)}
                    for m in data.get("models", [])
                ]
    except Exception:
        pass
    return []


OPENROUTER_POPULAR_MODELS = [
    {"id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4 (Anthropic)"},
    {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet (Anthropic)"},
    {"id": "openai/gpt-4o", "name": "GPT-4o (OpenAI)"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini (OpenAI)"},
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash (Google)"},
    {"id": "google/gemini-pro-1.5", "name": "Gemini Pro 1.5 (Google)"},
    {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B (Meta)"},
    {"id": "deepseek/deepseek-chat", "name": "DeepSeek Chat"},
    {"id": "mistralai/mistral-large-latest", "name": "Mistral Large (Mistral)"},
    {"id": "qwen/qwen-2.5-72b-instruct", "name": "Qwen 2.5 72B (Alibaba)"},
]
