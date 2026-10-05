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

## Gemini
The API key stays on the backend. Do not put it in React/Vite. Gemini powers syllabus analysis, question classification, answer keys, paper generation, previous-paper analysis and the exam assistant. The application uses the Google GenAI Python SDK and a configurable Gemini model.
