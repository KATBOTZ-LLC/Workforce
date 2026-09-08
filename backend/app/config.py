from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Loaded from environment variables, or a local .env file during development.

    None of these have defaults for secrets — the app refuses to start rather than
    silently running with an empty session secret or accepting any Google account.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_client_id: str
    session_secret: str

    # Optional: Firestore requires a GCP billing account to provision, which isn't
    # available yet. Login and access resolution (org_data.py / access.py) work with
    # this unset — only the best-effort "last login" record in auth.py is skipped.
    firestore_project_id: str | None = None

    # PostgreSQL. When set, the org chart is read from the database rather than
    # from the hardcoded seed in org_data.py, and Firestore is not consulted.
    database_url: str | None = None

    # Cloud Storage bucket holding uploaded documents. DOCUMENT_FILE.file_storage_key
    # is the object name within it — which is why that column is deliberately
    # opaque: changing the storage backend does not change the schema.
    documents_bucket: str | None = None

    allowed_domain: str = "katbotz.com"
    frontend_origin: str = "http://localhost:3000"


settings = Settings()
