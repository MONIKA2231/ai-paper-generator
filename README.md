# AIQPG - AI Question Paper Generator

Full-stack FastAPI + React + SQLite project.

## Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env and add GEMINI_API_KEY
python seed.py
python -m uvicorn app.main:app --reload
```
Backend: http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs

## Frontend
```powershell
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Demo accounts
- Admin: admin@apollouniversity.edu.in / Admin@123
- Faculty: faculty@apollouniversity.edu.in / Faculty@123

## Admin signup code
`Admin@2026` unless changed in `.env`.

## AI providers and paper generation
Keep AI provider keys in `backend/.env`; never put them in React/Vite. AI requests try configured backend providers in priority order: Gemini, xAI, OpenAI, then OpenRouter. If none is configured or all fail, the current provider list also includes a free Pollinations fallback. Set the corresponding API key and, optionally, model name in `backend/.env`.

The paper generator uses approved question-bank questions as its only subject-matter source. A question's `marks` value is its weightage: questions are selected or generated into matching-mark slots. `Question Bank Only` selects existing questions, `AI Generated from Question Bank` asks the configured AI provider to create questions from bank content, and `Question Bank + AI for Missing Questions` preserves suitable bank questions and uses AI to fill gaps from the same bank content. Syllabus text, topics, blueprints, and custom instructions are not sent as paper-generation content. Section B can use no choice, internal choice, or either/or alternatives.
