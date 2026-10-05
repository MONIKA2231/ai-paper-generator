from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import get_db
from ..models import User, AuditLog, LoginSession, Subject, Syllabus, Question, Blueprint, Paper, AnswerKey, PreviousPaper, VaultItem, Setting
from ..security import admin_user, hash_password
from ..schemas import AdminUserCreateIn, AdminUserUpdateIn, AdminUserResetPasswordIn

router = APIRouter(prefix="/admin", tags=["Admin"])

MODEL_MAP = {
    "users": User,
    "subjects": Subject,
    "syllabi": Syllabus,
    "questions": Question,
    "blueprints": Blueprint,
    "papers": Paper,
    "answer_keys": AnswerKey,
    "previous_papers": PreviousPaper,
    "vault_items": VaultItem,
    "settings": Setting,
    "audit_logs": AuditLog,
    "login_sessions": LoginSession,
}

@router.get("/users")
def list_users(db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    users = db.query(User).order_by(User.id.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "department": u.department or "",
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "last_active": u.last_active.isoformat() if u.last_active else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@router.post("/users")
def create_user(data: AdminUserCreateIn, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    email = str(data.email).lower().strip()
    if not email.endswith("@apollouniversity.edu.in"):
        raise HTTPException(status_code=400, detail="Only @apollouniversity.edu.in accounts are allowed")
    
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
        department=data.department.strip()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(AuditLog(
        user_id=current_admin.id,
        action="ADMIN_CREATE_USER",
        details=f"Created user '{user.email}' with role '{user.role}'"
    ))
    db.commit()

    return {"message": f"User {user.email} created successfully", "user_id": user.id}

@router.put("/users/{user_id}")
def update_user(user_id: int, data: AdminUserUpdateIn, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    email = str(data.email).lower().strip()
    if not email.endswith("@apollouniversity.edu.in"):
        raise HTTPException(status_code=400, detail="Only @apollouniversity.edu.in accounts are allowed")

    if email != user.email:
        conflict = db.query(User).filter(User.email == email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email is already used by another user")

    user.name = data.name.strip()
    user.email = email
    user.role = data.role
    user.department = data.department.strip()

    db.add(AuditLog(
        user_id=current_admin.id,
        action="ADMIN_UPDATE_USER",
        details=f"Updated user #{user.id} ({user.email}) role={user.role}, dept={user.department}"
    ))
    db.commit()

    return {"message": f"User #{user.id} updated successfully"}

@router.put("/users/{user_id}/reset-password")
def reset_user_password(user_id: int, data: AdminUserResetPasswordIn, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(data.password)

    db.add(AuditLog(
        user_id=current_admin.id,
        action="ADMIN_RESET_PASSWORD",
        details=f"Reset password for user #{user.id} ({user.email})"
    ))
    db.commit()

    return {"message": f"Password for {user.email} reset successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    email = user.email
    db.delete(user)

    db.add(AuditLog(
        user_id=current_admin.id,
        action="ADMIN_DELETE_USER",
        details=f"Deleted user #{user_id} ({email})"
    ))
    db.commit()

    return {"message": f"User #{user_id} ({email}) deleted successfully"}

@router.get("/logs")
def list_logs(db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(500).all()
    return [
        {
            "id": x.id,
            "user_id": x.user_id,
            "action": x.action,
            "details": x.details,
            "created_at": x.created_at.isoformat() if x.created_at else None,
        }
        for x in logs
    ]

@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    sessions = db.query(LoginSession).order_by(LoginSession.id.desc()).limit(500).all()
    return [
        {
            "id": x.id,
            "user_id": x.user_id,
            "login_at": x.login_at.isoformat() if x.login_at else None,
            "logout_at": x.logout_at.isoformat() if x.logout_at else None,
            "status": x.status,
            "ip_address": x.ip_address,
        }
        for x in sessions
    ]

@router.post("/sessions/{session_id}/terminate")
def terminate_session(session_id: int, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    sess = db.query(LoginSession).filter(LoginSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sess.status = "terminated"
    sess.logout_at = datetime.utcnow()

    db.add(AuditLog(
        user_id=current_admin.id,
        action="ADMIN_TERMINATE_SESSION",
        details=f"Terminated login session #{session_id} for user #{sess.user_id}"
    ))
    db.commit()

    return {"message": f"Session #{session_id} terminated"}

@router.get("/tables")
def list_tables(db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    return {"tables": list(MODEL_MAP.keys())}

@router.get("/tables/{table_name}")
def get_table_data(table_name: str, limit: int = 100, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    model = MODEL_MAP.get(table_name.lower().strip())
    if not model:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

    columns = [c.name for c in model.__table__.columns]
    records = db.query(model).order_by(model.id.desc()).limit(limit).all()
    total_count = db.query(model).count()

    rows = []
    for r in records:
        row_dict = {}
        for col in columns:
            val = getattr(r, col)
            if isinstance(val, datetime):
                val = val.isoformat()
            row_dict[col] = val
        rows.append(row_dict)

    return {
        "table_name": table_name,
        "columns": columns,
        "total_records": total_count,
        "rows": rows
    }

@router.delete("/tables/{table_name}/{row_id}")
def delete_table_record(table_name: str, row_id: int, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    model = MODEL_MAP.get(table_name.lower().strip())
    if not model:
        raise HTTPException(status_code=404, detail="Table not found")
    record = db.get(model, row_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": f"Deleted record {row_id} from {table_name}"}

@router.put("/tables/{table_name}/{row_id}")
async def update_table_record(table_name: str, row_id: int, request: Request, db: Session = Depends(get_db), current_admin = Depends(admin_user)):
    model = MODEL_MAP.get(table_name.lower().strip())
    if not model:
        raise HTTPException(status_code=404, detail="Table not found")
    record = db.get(model, row_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    body = await request.json()
    for k, v in body.items():
        if hasattr(record, k) and k != "id":
            setattr(record, k, v)
    
    db.commit()
    return {"message": f"Updated record {row_id} in {table_name}"}
