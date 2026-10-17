from app.db import SessionLocal
from app.routers.modules import generate_paper, PaperGenIn
from app.models import User, Subject
db=SessionLocal()
u=db.query(User).first()
s=db.query(Subject).first()
res=generate_paper(PaperGenIn(subject_id=s.id, title='AI Test', exam_type='Test', duration='90', total_questions=10, total_marks=50, section_a_questions=5, section_a_marks=2, section_b_questions=2, section_b_marks=8, choice_mode='Either/Or', generation_mode='ai'), db, u)
import json
print(json.dumps(res['content'], indent=2))
