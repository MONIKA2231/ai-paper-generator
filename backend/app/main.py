from dotenv import load_dotenv
load_dotenv()
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(auth_router,prefix='/api');app.include_router(subjects_router,prefix='/api');app.include_router(modules_router,prefix='/api');app.include_router(admin_router,prefix='/api')
@app.get('/')
def root():return {'name':'AIQPG','status':'running','docs':'/docs'}
