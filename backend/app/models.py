from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from .db import Base

now = lambda: datetime.utcnow()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="faculty", nullable=False)
    department = Column(String(120), default="")
    last_login = Column(DateTime)
    last_active = Column(DateTime)
    created_at = Column(DateTime, default=now)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    department = Column(String(120), default="")
    semester = Column(String(30), default="")
    academic_year = Column(String(30), default="")
    credits = Column(Integer, default=0)
    description = Column(Text, default="")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Syllabus(Base):
    __tablename__ = "syllabi"
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), default="")
    extracted_text = Column(Text, default="")
    units = Column(Text, default="[]")
    learning_outcomes = Column(Text, default="[]")
    total_units = Column(Integer, default=0)
    total_topics = Column(Integer, default=0)
    status = Column(String(30), default="draft")
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=True)
    unit = Column(String(100), default="")
    topic = Column(String(200), default="")
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="Descriptive")
    difficulty = Column(String(30), default="Medium")
    marks = Column(Integer, default=1)
    bloom_level = Column(String(40), default="Understand")
    course_outcome = Column(String(40), default="CO1")
    keywords = Column(Text, default="")
    options = Column(Text, default="[]")
    answer = Column(Text, default="")
    source_file = Column(String(255), default="")
    duplicate_status = Column(String(30), default="unique")
    mapping_status = Column(String(30), default="mapped")
    status = Column(String(30), default="approved")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Blueprint(Base):
    __tablename__ = "blueprints"
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=True)
    blueprint_name = Column(String(255), nullable=False)
    exam_type = Column(String(100), default="Internal Assessment")
    duration = Column(String(50), default="90 Minutes")
    total_marks = Column(Integer, default=50)
    total_questions = Column(Integer, default=25)
    question_pattern = Column(Text, default="{}")
    unit_weightage = Column(Text, default="{}")
    difficulty_distribution = Column(Text, default="{}")
    bloom_distribution = Column(Text, default="{}")
    co_distribution = Column(Text, default="{}")
    status = Column(String(30), default="draft")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class Paper(Base):
    __tablename__ = "papers"
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=True)
    blueprint_id = Column(Integer, ForeignKey("blueprints.id"), nullable=True)
    title = Column(String(255), nullable=False)
    exam_type = Column(String(100), default="Internal Assessment")
    duration = Column(String(50), default="90 Minutes")
    total_marks = Column(Integer, default=50)
    total_questions = Column(Integer, default=25)
    paper_content = Column(Text, default="[]")
    validation_result = Column(Text, default="{}")
    status = Column(String(30), default="draft")
    generated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class AnswerKey(Base):
    __tablename__ = "answer_keys"
    id = Column(Integer, primary_key=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    question_text = Column(Text, nullable=False)
    answer = Column(Text, default="")
    key_points = Column(Text, default="[]")
    marks = Column(Integer, default=1)
    answer_type = Column(String(30), default="Point-wise")
    ai_generated = Column(Boolean, default=True)
    faculty_edited = Column(Boolean, default=False)
    validation_status = Column(String(30), default="pending")
    status = Column(String(30), default="draft")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

class PreviousPaper(Base):
    __tablename__ = "previous_papers"
    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), default="")
    analysis = Column(Text, default="{}")
    status = Column(String(30), default="analyzed")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now)

class VaultItem(Base):
    __tablename__ = "vault_items"
    id = Column(Integer, primary_key=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    version = Column(Integer, default=1)
    action = Column(String(50), default="saved")
    notes = Column(Text, default="")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now)

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    key = Column(String(100), nullable=False)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=now, onupdate=now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=now)

class LoginSession(Base):
    __tablename__ = "login_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    login_at = Column(DateTime, default=now)
    logout_at = Column(DateTime, nullable=True)
    ip_address = Column(String(100), default="")
    status = Column(String(30), default="active")
