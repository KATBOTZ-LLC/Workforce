from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .auth import router as auth_router
from .config import settings
from .dev_login import dev_login_enabled
from .dev_login import router as dev_login_router
from .directory import router as directory_router
from .documents import public_router as onboarding_router
from .documents import router as documents_router
from .employees import router as employees_router
from .me import router as me_router
from .org import router as org_router
from .workers import router as workers_router

app = FastAPI(title="KATBOTZ Workforce API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(me_router)
app.include_router(org_router)
app.include_router(workers_router)
app.include_router(directory_router)
app.include_router(employees_router)
app.include_router(documents_router)
app.include_router(onboarding_router)

# Registered only when explicitly enabled, so the route does not exist at all in
# a normal deployment. See app/dev_login.py.
if dev_login_enabled():
    app.include_router(dev_login_router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # The bare root has no page of its own — send visitors somewhere useful instead
    # of a bare 404, since this is the single most-visited URL by hand.
    return RedirectResponse(url="/docs")
