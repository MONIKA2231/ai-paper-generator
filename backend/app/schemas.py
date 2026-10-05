from pydantic import BaseModel, EmailStr, Field, field_validator

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str = "faculty"
    admin_code: str | None = None
    @field_validator("role")
    @classmethod
    def role_ok(cls, v):
        v=v.lower().strip()
        if v not in {"faculty","admin"}: raise ValueError("Role must be faculty or admin")
        return v

class LoginIn(BaseModel):
    email: EmailStr
    password: str
class ForgotPasswordIn(BaseModel): email: EmailStr
class VerifyOTPIn(BaseModel): email: EmailStr; otp: str = Field(min_length=6,max_length=6)
class ResetPasswordIn(BaseModel): email: EmailStr; otp: str = Field(min_length=6,max_length=6); new_password: str = Field(min_length=8,max_length=72)
class SubjectIn(BaseModel):
    name: str; code: str; department: str=""; semester: str=""; academic_year: str=""; credits:int=0; description:str=""
class QuestionIn(BaseModel):
    subject_id:int; syllabus_id:int|None=None; question_text:str; unit:str=""; topic:str=""; marks:int=1
class BlueprintIn(BaseModel):
    subject_id:int; syllabus_id:int|None=None; blueprint_name:str; exam_type:str="Internal Assessment"; duration:str="90 Minutes"; total_marks:int=50; total_questions:int=25
    question_pattern:dict={}; unit_weightage:dict={}; difficulty_distribution:dict={}; bloom_distribution:dict={}; co_distribution:dict={}
class PaperGenIn(BaseModel):
    subject_id:int; syllabus_id:int|None=None; blueprint_id:int|None=None; title:str="AI Generated Question Paper"; exam_type:str="Internal Assessment"; duration:str="90 Minutes"; total_marks:int=50; total_questions:int=10; choice_mode:str="No Choice"; generation_mode:str="hybrid"; topics:list[str]=[]; instructions:str=""; section_a_questions:int=5; section_a_marks:int=2; section_b_questions:int=5; section_b_marks:int=8
    subject_id:int; syllabus_id:int|None=None; blueprint_id:int|None=None; title:str="AI Generated Question Paper"; exam_type:str="Internal Assessment"; duration:str="90 Minutes"; total_marks:int=50; total_questions:int=10; choice_mode:str="No Choice"; topics:list[str]=[]; instructions:str=""; section_a_questions:int=5; section_a_marks:int=2; section_b_questions:int=5; section_b_marks:int=8
class AnswerGenIn(BaseModel): paper_id:int|None=None; question_id:int|None=None; question_text:str; marks:int=1
class ChatIn(BaseModel): message:str

class AdminUserCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str = "faculty"
    department: str = ""

class AdminUserUpdateIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: str = "faculty"
    department: str = ""

class AdminUserResetPasswordIn(BaseModel):
    password: str = Field(min_length=8, max_length=72)

