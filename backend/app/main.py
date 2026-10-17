from dotenv import load_dotenv
load_dotenv()
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base,engine
from . import models
from .routers.auth import router as auth_router
from .routers.subjects import router as subjects_router
from .routers.modules import router as modules_router
from .routers.admin import router as admin_router
Base.metadata.create_all(bind=engine)
app = FastAPI(title='AIQPG - AI Question Paper Generator', version='2.0.0')

allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
]
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

cors_regex = os.getenv("CORS_ORIGIN_REGEX", r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")
if os.getenv("CORS_ALLOW_ALL", "true").lower() in ("true", "1", "yes"):
    cors_regex = r"^https?://.*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(auth_router,prefix='/api');app.include_router(subjects_router,prefix='/api');app.include_router(modules_router,prefix='/api');app.include_router(admin_router,prefix='/api')
@app.get('/')
def root():return {'name':'AIQPG','status':'running','docs':'/docs'}
