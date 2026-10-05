from app.db import Base,engine,SessionLocal
from app.models import User,Subject
from app.security import hash_password
Base.metadata.create_all(bind=engine);db=SessionLocal()
if not db.query(User).filter_by(email='admin@apollouniversity.edu.in').first():db.add(User(name='Administrator',email='admin@apollouniversity.edu.in',password_hash=hash_password('Admin@123'),role='admin'))
if not db.query(User).filter_by(email='faculty@apollouniversity.edu.in').first():db.add(User(name='Demo Faculty',email='faculty@apollouniversity.edu.in',password_hash=hash_password('Faculty@123'),role='faculty',department='CSE'))
if not db.query(Subject).first():db.add(Subject(name='Data Structures',code='CS201',department='CSE',semester='III',academic_year='2026-27',credits=4,description='Core data structures and algorithms'))
db.commit();print('Seed complete')
