from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "COGNIX Diagnostic Agent"
    environment: str = "development"
    database_url: str = "sqlite:///./cognix.db"
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.6-mini"
    retrieval_top_k: int = 8
    min_evidence_for_confirmation: int = 2
    confirmation_threshold: float = 0.78
    revision_margin: float = 0.18
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
