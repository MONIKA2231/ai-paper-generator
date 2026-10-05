
from app.db import SessionLocal
from app.models import Subject
from app.services.ai import generate_paper
db = SessionLocal()
subject = db.query(Subject).first()
try:
    content = generate_paper(subject, [], 10, 2, '90 mins', 'no', '', '')
    print('CONTENT:', content)
except Exception as e:
    print('EXCEPTION:', e)

