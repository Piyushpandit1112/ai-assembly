@echo off
REM ──────────────────────────────────────────────────────────────
REM  KidLearn AI — Start Server
REM  Run this every time you want to start the app.
REM ──────────────────────────────────────────────────────────────

echo.
echo  =========================================
echo   KidLearn AI — Starting Server
echo  =========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if Ollama is needed
echo  Reminder: Make sure Ollama is running!
echo  If not started, open a new terminal and run: ollama serve
echo.
echo  Starting KidLearn AI server...
echo  Open your browser at: http://localhost:8000
echo  API Docs available at: http://localhost:8000/docs
echo.

REM Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
