from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Subject,AuditLog
from ..schemas import SubjectIn
from ..security import current_user
router=APIRouter(prefix="/subjects",tags=["Subjects"])

def out(s): return {"id":s.id,"name":s.name,"code":s.code,"department":s.department,"semester":s.semester,"academic_year":s.academic_year,"credits":s.credits,"description":s.description}
@router.get("")
def list_subjects(db:Session=Depends(get_db),user=Depends(current_user)): return [out(s) for s in db.query(Subject).order_by(Subject.id.desc()).all()]
@router.post("")
def create(data:SubjectIn,db:Session=Depends(get_db),user=Depends(current_user)):
    if db.query(Subject).filter(Subject.code==data.code.strip()).first(): raise HTTPException(400,"Subject code already exists")
    s=Subject(**data.model_dump());s.created_by=user.id;db.add(s);db.commit();db.refresh(s);db.add(AuditLog(user_id=user.id,action="SUBJECT_CREATED",details=s.code));db.commit();return out(s)
@router.put("/{sid}")
def update(sid:int,data:SubjectIn,db:Session=Depends(get_db),user=Depends(current_user)):
    s=db.get(Subject,sid)
    if not s: raise HTTPException(404,"Subject not found")
    for k,v in data.model_dump().items(): setattr(s,k,v)
    db.commit();db.refresh(s);return out(s)
@router.delete("/{sid}")
def delete(sid:int,db:Session=Depends(get_db),user=Depends(current_user)):
    s=db.get(Subject,sid)
    if not s: raise HTTPException(404,"Subject not found")
    db.delete(s);db.commit();return {"message":"Subject deleted"}
