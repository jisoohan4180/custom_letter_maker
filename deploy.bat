@echo off
cd /d "%~dp0"

:: 프론트엔드 빌드
echo [build] 프론트엔드 빌드 중...
npm run build
if errorlevel 1 (
    echo [ERROR] npm run build 실패
    pause
    exit /b 1
)

:: 가상환경 활성화
if not exist venv (
    echo [ERROR] venv 없음. start.bat 을 먼저 실행해주세요.
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

:: Alembic 마이그레이션
echo [setup] DB 마이그레이션 실행 중...
cd backend
alembic upgrade head
cd ..

:: 서버 시작
echo.
echo [info] http://localhost:8000 에서 서버 시작합니다...
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
