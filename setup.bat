@echo off
REM ──────────────────────────────────────────────────────────────
REM  KidLearn AI — Windows Setup Script
REM  Run this ONCE to set up the project.
REM ──────────────────────────────────────────────────────────────

echo.
echo  =========================================
echo   KidLearn AI — Project Setup
echo  =========================================
echo.

REM Step 1: Create virtual environment
echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)
echo       Done!

REM Step 2: Activate venv
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

REM Step 3: Upgrade pip
echo [3/4] Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Step 4: Install dependencies
echo [4/4] Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo       Done!

REM Copy .env.example to .env if not exists
if not exist .env (
    copy .env.example .env >nul
    echo.
    echo  NOTE: .env file created from .env.example
    echo        Edit it to configure AI provider settings.
)

echo.
echo  =========================================
echo   Setup Complete!
echo  =========================================
echo.
echo  NEXT STEPS:
echo  1. Install Ollama from: https://ollama.com
echo  2. Run:  ollama pull llama3.2
echo  3. Run:  run.bat   (to start the app)
echo.
pause
