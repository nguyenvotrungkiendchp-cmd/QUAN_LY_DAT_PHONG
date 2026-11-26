@echo off
echo Starting PTIT RoomBooking Backend (FastAPI on http://localhost:8000)...
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && .venv\Scripts\uvicorn main:app --reload --port 8000"
echo Starting PTIT RoomBooking Frontend (React on http://localhost:5173)...
start "Frontend - React" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5173"
echo.
echo Mo trinh duyet tai: http://localhost:5173
echo Swagger API Docs: http://localhost:8000/docs
