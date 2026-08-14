from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI engine configuration. Credentials/model weights are provided separately."""

    app_name: str = "AapdaSetu AI Engine"
    model_path: str = "models/damage_model.pt"
    default_confidence: float = 0.0

    model_config = SettingsConfigDict(env_file=".env", env_prefix="DAMAGE_ML_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
