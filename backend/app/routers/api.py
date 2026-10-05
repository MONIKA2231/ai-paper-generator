from datetime import datetime, timedelta, timezone
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, inspect
from sqlalchemy.orm import Session

from ..db import get_db, engine
from ..models import *
from ..schemas import *
from ..security import (
    create_access_token, decode_token, generate_otp, generate_reset_token,
    hash_password, hash_value, verify_password,
)
from ..email_service import send_otp_email
from ..services.ai import generate_questions, analyze_text, duplicate_matches

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
COLLEGE_DOMAIN = "apollouniversity.edu.in"
ADMIN_SIGNUP_CODE = os.getenv("ADMIN_SIGNUP_CODE", "Admin@2026")
OTP_MINUTES = int(os.getenv("OTP_MINUTES", "10"))
RESET_TOKEN_MINUTES = int(os.getenv("RESET_TOKEN_MINUTES", "15"))

MODEL_MAP = {
    "users": User, "subjects": Subject, "syllabi": Syllabus, "questions": Question,
    "blueprints": Blueprint, "papers": Paper, "previous_papers": PreviousPaper,
    "answer_keys": AnswerKey, "reviews": Review, "vault_items": VaultItem,
    "settings": Setting, "audit_logs": AuditLog, "login_sessions": LoginSession,
}

def is_college_email(email: str) -> bool:
    email = email.strip().lower()
    return email.endswith("@" + COLLEGE_DOMAIN)

def now_utc_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    return (forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else None)

def log_action(db: Session, user: User | None, action: str, description: str = "", request: Request | None = None):
    db.add(AuditLog(
        user_id=user.id if user else None, action=action, description=description,
        ip_address=client_ip(request) if request else None,
        user_agent=(request.headers.get("user-agent", "")[:500] if request else None),
    ))

def user_payload(user: User):
    return {
        "id": user.id, "name": user.name, "email": user.email, "role": user.role,
        "status": user.status, "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "last_active": user.last_active.isoformat() if user.last_active else None,
    }

def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db), request: Request = None):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = db.get(User, int(payload["sub"]))
    if not user or user.status != "Active":
        raise HTTPException(status_code=401, detail="Account is not active")
    # Update last-active timestamp on every authenticated API request.
    now = now_utc_naive()
    user.last_active = now
    db.commit()
    return user

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user

@router.post("/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db), request: Request = None):
    email = str(data.email).strip().lower()
    if not is_college_email(email):
        raise HTTPException(status_code=400, detail=f"Use your official @{COLLEGE_DOMAIN} email address.")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    if data.role == "admin" and data.admin_code != ADMIN_SIGNUP_CODE:
        raise HTTPException(status_code=403, detail="Administrator registration code is invalid.")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password), role=data.role, status="Active")
    db.add(user); db.flush(); log_action(db, user, "REGISTER", "Account created", request); db.commit(); db.refresh(user)
    return {"message":"Registration successful. Please sign in.", "user": user_payload(user)}

@router.post("/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db), request: Request = None):
    email = str(data.email).strip().lower()
    if not is_college_email(email):
        raise HTTPException(status_code=400, detail=f"Use your official @{COLLEGE_DOMAIN} email address.")
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not verify_password(data.password, user.password_hash):
        if user:
            log_action(db, user, "LOGIN_FAILED", "Invalid password", request); db.commit()
        raise HTTPException(status_code=401, detail="Invalid college email or password")
    if user.status != "Active":
        log_action(db, user, "LOGIN_BLOCKED", "Account is disabled", request); db.commit()
        raise HTTPException(status_code=403, detail="Account is disabled")
    now = now_utc_naive(); user.last_login = now; user.last_active = now
    token_id = uuid.uuid4().hex
    token = create_access_token(user.id, user.role, token_id=token_id)
    db.add(LoginSession(user_id=user.id, login_time=now, last_active=now, ip_address=client_ip(request), user_agent=(request.headers.get("user-agent", "")[:500] if request else ""), status="Active", token_id=token_id))
    log_action(db, user, "LOGIN", "Successful sign in", request); db.commit()
    return {"access_token": token, "token_type":"bearer", "user":user_payload(user)}

@router.post("/auth/logout")
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db), request: Request = None):
    if not credentials:
        return {"message":"Logged out"}
    payload = decode_token(credentials.credentials)
    if payload and payload.get("sub"):
        user = db.get(User, int(payload["sub"]))
        if user:
            now = now_utc_naive()
            session = db.query(LoginSession).filter(LoginSession.user_id == user.id, LoginSession.token_id == payload.get("jti"), LoginSession.status == "Active").order_by(LoginSession.id.desc()).first()
            if session:
                session.logout_time = now; session.last_active = now; session.status = "Logged Out"
            log_action(db, user, "LOGOUT", "Signed out", request); db.commit()
    return {"message":"Logged out"}

@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_payload(user)

@router.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordIn, db: Session = Depends(get_db), request: Request = None):
    email = str(data.email).strip().lower()
    if not is_college_email(email):
        raise HTTPException(status_code=400, detail=f"Use your official @{COLLEGE_DOMAIN} email address.")
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user:
        otp = generate_otp(); now = now_utc_naive()
        user.reset_otp_hash = hash_value(otp); user.reset_otp_expires_at = now + timedelta(minutes=OTP_MINUTES); user.reset_token_hash = None; user.reset_token_expires_at = None
        log_action(db, user, "PASSWORD_OTP_REQUEST", "Password reset OTP requested", request); db.commit()
        try: send_otp_email(user.email, otp)
        except Exception as exc: print(f"[OTP EMAIL ERROR] {exc}")
    return {"message":"If that college email is registered, an OTP has been sent."}

@router.post("/auth/verify-otp")
def verify_otp(data: VerifyOTPIn, db: Session = Depends(get_db), request: Request = None):
    email = str(data.email).strip().lower(); user = db.query(User).filter(func.lower(User.email) == email).first(); now = now_utc_naive()
    if not user or not user.reset_otp_hash or not user.reset_otp_expires_at or user.reset_otp_expires_at < now or hash_value(data.otp) != user.reset_otp_hash:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    reset_token = generate_reset_token(); user.reset_token_hash = hash_value(reset_token); user.reset_token_expires_at = now + timedelta(minutes=RESET_TOKEN_MINUTES); user.reset_otp_hash = None; user.reset_otp_expires_at = None
    log_action(db, user, "PASSWORD_OTP_VERIFIED", "Password reset OTP verified", request); db.commit()
    return {"message":"OTP verified.", "reset_token":reset_token}

@router.post("/auth/reset-password")
def reset_password(data: ResetPasswordIn, db: Session = Depends(get_db), request: Request = None):
    email = str(data.email).strip().lower(); user = db.query(User).filter(func.lower(User.email) == email).first(); now = now_utc_naive()
    if not user or not user.reset_token_hash or not user.reset_token_expires_at or user.reset_token_expires_at < now or hash_value(data.reset_token) != user.reset_token_hash:
        raise HTTPException(status_code=400, detail="Password reset session is invalid or expired")
    user.password_hash = hash_password(data.new_password); user.reset_token_hash = None; user.reset_token_expires_at = None
    log_action(db, user, "PASSWORD_RESET", "Password changed successfully", request); db.commit()
    return {"message":"Password reset successful. You can now sign in."}

@router.post("/activity")
def activity(data: ActivityIn, user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    log_action(db, user, data.action, data.description, request); db.commit(); return {"ok":True}

@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"questions":db.query(Question).count() or 28, "papers":db.query(Paper).count() or 42, "coverage":92.6, "role":user.role}

# Standard module CRUD-style endpoints.
for path, model in {
    "subjects":Subject, "syllabus":Syllabus, "questions":Question, "blueprints":Blueprint, "papers":Paper,
    "previous-papers":PreviousPaper, "answer-keys":AnswerKey, "reviews":Review, "vault":VaultItem,
}.items():
    def make_get(m=model):
        def get(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
            rows = db.query(m).order_by(m.id.desc()).all(); return {"items":[{"id":x.id,"name":getattr(x,"name",None),"description":getattr(x,"description",None),"status":getattr(x,"status","Active")} for x in rows]}
        return get
    router.add_api_route(f"/{path}", make_get(), methods=["GET"])
    def make_post(m=model, path_name=path):
        def post(payload: ItemIn, db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
            obj=m(name=payload.name, description=payload.description); db.add(obj); db.flush(); log_action(db,user,"RECORD_CREATE",f"Created {path_name}: {obj.name}",request); db.commit(); db.refresh(obj); return {"id":obj.id,"name":obj.name,"description":obj.description}
        return post
    router.add_api_route(f"/{path}", make_post(), methods=["POST"])

@router.post("/ai-paper/generate")
def ai_paper(data: PaperIn, user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    result={"title":data.subject.upper(),"questions":generate_questions(data.subject,data.difficulty,data.questions)}; log_action(db,user,"PAPER_GENERATE",f"Generated paper for {data.subject}",request); db.commit(); return result

@router.post("/paper-analyzer")
def paper_analyzer(data: TextIn, user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    result=analyze_text(data.text); log_action(db,user,"PAPER_ANALYZE","Analyzed paper text",request); db.commit(); return result

@router.post("/duplicate-detector")
def duplicate_detector(data: TextIn, user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    result=duplicate_matches(data.text); log_action(db,user,"DUPLICATE_CHECK","Checked text for duplicates",request); db.commit(); return result

@router.post("/assistant")
def assistant(data: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m=data.message.lower()
    if "paper" in m: reply="Use Blueprint Designer to set marks and distribution, then generate the paper and run Paper Analyzer before approval."
    elif "syllabus" in m: reply="Use Syllabus Analyzer to organize units, topics and learning outcomes before generating questions."
    elif "duplicate" in m: reply="Use Duplicate Detector before approval to find similar questions in your stored question bank."
    else: reply="I can help with syllabus coverage, blueprints, paper generation, duplicate checking, analysis and approval workflows."
    return {"reply":reply}

@router.get("/admin/database")
def database_overview(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    inspector=inspect(engine); tables=[]
    for name in inspector.get_table_names():
        count=db.execute(__import__('sqlalchemy').text(f'SELECT COUNT(*) FROM "{name}"')).scalar()
        columns=[{"name":c["name"],"type":str(c["type"]),"nullable":c["nullable"]} for c in inspector.get_columns(name)]
        tables.append({"name":name,"count":count,"columns":columns})
    return {"tables":tables}

@router.get("/admin/database/{table_name}")
def database_table(table_name: str, offset:int=0, limit:int=100, search:str="", admin: User=Depends(require_admin), db: Session=Depends(get_db)):
    if table_name not in MODEL_MAP: raise HTTPException(status_code=404, detail="Unknown table")
    model=MODEL_MAP[table_name]; rows=db.query(model)
    # Search common text fields.
    if search:
        cols=[]
        for attr in ["name","email","role","status","action","description","topic"]:
            if hasattr(model, attr): cols.append(getattr(model, attr).ilike(f"%{search}%"))
        if cols: rows=rows.filter(*([__import__('sqlalchemy').or_(*cols)]))
    rows=rows.order_by(model.id.desc()).offset(max(0,offset)).limit(min(500,max(1,limit))).all()
    out=[]
    for row in rows:
        data={}
        for col in inspect(model).columns:
            value=getattr(row,col.key,None)
            if col.key == "password_hash": value="[PROTECTED HASH]"
            if isinstance(value, datetime): value=value.isoformat()
            data[col.key]=value
        out.append(data)
    return {"table":table_name,"rows":out,"count":len(out)}

@router.get("/admin/activity")
def admin_activity(limit:int=200, action:str="", admin: User=Depends(require_admin), db: Session=Depends(get_db)):
    q=db.query(AuditLog).order_by(AuditLog.id.desc())
    if action: q=q.filter(AuditLog.action==action)
    rows=q.limit(min(500,max(1,limit))).all()
    return {"items":[{"id":x.id,"user_id":x.user_id,"action":x.action,"description":x.description,"ip_address":x.ip_address,"user_agent":x.user_agent,"created_at":x.created_at.isoformat() if x.created_at else None} for x in rows]}

@router.get("/admin/sessions")
def admin_sessions(limit:int=200, admin: User=Depends(require_admin), db: Session=Depends(get_db)):
    rows=db.query(LoginSession).order_by(LoginSession.id.desc()).limit(min(500,max(1,limit))).all()
    result=[]
    for x in rows:
        u=db.get(User,x.user_id); result.append({"id":x.id,"user_id":x.user_id,"user_name":u.name if u else None,"email":u.email if u else None,"login_time":x.login_time.isoformat() if x.login_time else None,"logout_time":x.logout_time.isoformat() if x.logout_time else None,"last_active":x.last_active.isoformat() if x.last_active else None,"status":x.status,"ip_address":x.ip_address,"device":x.user_agent})
    return {"items":result}

@router.get("/admin/users")
def admin_users(admin: User=Depends(require_admin), db: Session=Depends(get_db)):
    rows=db.query(User).order_by(User.id.desc()).all()
    return {"items":[user_payload(u)|{"has_password":bool(u.password_hash)} for u in rows]}
