import os, random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, AuditLog, LoginSession
from ..schemas import RegisterIn,LoginIn,ForgotPasswordIn,VerifyOTPIn,ResetPasswordIn
from ..security import hash_password,verify_password,create_token,current_user

router=APIRouter(prefix="/auth",tags=["Auth"])
_otp={}

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str
@router.post("/register")
def register(data:RegisterIn,db:Session=Depends(get_db)):
    email=str(data.email).lower().strip()
    if not email.endswith("@apollouniversity.edu.in"): raise HTTPException(400,"Only @apollouniversity.edu.in accounts are allowed")
    if db.query(User).filter(User.email==email).first(): raise HTTPException(400,"Account already exists")
    if data.role=="admin" and data.admin_code != os.getenv("ADMIN_SIGNUP_CODE","Admin@2026"): raise HTTPException(403,"Invalid administrator code")
    u=User(name=data.name.strip(),email=email,password_hash=hash_password(data.password),role=data.role)
    db.add(u);db.commit();db.refresh(u)
    db.add(AuditLog(user_id=u.id,action="ACCOUNT_CREATED",details=f"Role: {u.role}"));db.commit()
    return {"message":"Account created successfully"}

@router.post("/login")
def login(data:LoginIn,request:Request,db:Session=Depends(get_db)):
    email=str(data.email).lower().strip();u=db.query(User).filter(User.email==email).first()
    if not u or not verify_password(data.password,u.password_hash): raise HTTPException(401,"Invalid email or password")
    now=datetime.utcnow();u.last_login=now;u.last_active=now
    s=LoginSession(user_id=u.id,login_at=now,status="active",ip_address=request.client.host if request.client else "")
    db.add(s);db.add(AuditLog(user_id=u.id,action="LOGIN",details="Successful login"));db.commit()
    return {"access_token":create_token(u),"token_type":"bearer","user":{"id":u.id,"name":u.name,"email":u.email,"role":u.role,"department":u.department}}

@router.post("/logout")
def logout(user=Depends(current_user),db:Session=Depends(get_db)):
    s=db.query(LoginSession).filter(LoginSession.user_id==user.id,LoginSession.status=="active").order_by(LoginSession.id.desc()).first()
    if s:s.logout_at=datetime.utcnow();s.status="logged_out"
    db.add(AuditLog(user_id=user.id,action="LOGOUT",details="User signed out"));db.commit();return {"message":"Signed out"}

@router.post("/forgot-password")
def forgot(data:ForgotPasswordIn,db:Session=Depends(get_db)):
    email=str(data.email).lower().strip();u=db.query(User).filter(User.email==email).first()
    if not u: raise HTTPException(404,"Account not found")
    otp=f"{random.randint(0,999999):06d}";_otp[email]=(otp,datetime.utcnow()+timedelta(minutes=int(os.getenv("OTP_MINUTES","10"))))
    return {"message":"OTP generated. Check your configured email service.","development_otp":otp}

@router.post("/verify-otp")
def verify_otp(data:VerifyOTPIn):
    item=_otp.get(str(data.email).lower().strip())
    if not item or item[0]!=data.otp or item[1]<datetime.utcnow(): raise HTTPException(400,"Invalid or expired OTP")
    return {"message":"OTP verified"}

@router.post("/reset-password")
def reset(data:ResetPasswordIn,db:Session=Depends(get_db)):
    email=str(data.email).lower().strip();item=_otp.get(email)
    if not item or item[0]!=data.otp or item[1]<datetime.utcnow(): raise HTTPException(400,"Invalid or expired OTP")
    u=db.query(User).filter(User.email==email).first()
    if not u: raise HTTPException(404,"Account not found")
    u.password_hash=hash_password(data.new_password);del _otp[email];db.add(AuditLog(user_id=u.id,action="PASSWORD_RESET",details="Password reset"));db.commit()
    return {"message":"Password reset successful"}
@router.post("/change-password")
def change_password(
    data: ChangePasswordIn,
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    current_password = str(
        data.current_password or ''
    )

    new_password = str(
        data.new_password or ''
    )

    if not current_password:
        raise HTTPException(
            status_code=400,
            detail="Current password is required.",
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail=(
                "New password must contain "
                "at least 8 characters."
            ),
        )

    if not verify_password(
        current_password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect.",
        )

    user.password_hash = hash_password(
        new_password
    )

    db.add(user)
    db.commit()

    return {
        "message":
            "Password changed successfully."
    }