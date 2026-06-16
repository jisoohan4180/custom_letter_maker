@echo off
cd /d "%~dp0"

:: 가상환경 생성 (최초 실행 시)
if not exist venv (
    echo [setup] 가상환경 생성 중...
    python -m venv venv
)

:: 가상환경 활성화
call venv\Scripts\activate.bat

:: 의존성 설치 확인 (fastapi 기준으로 확인)
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [setup] Python 패키지 설치 중...
    pip install -r backend\requirements.txt
)

:: .env 파일 확인
if not exist .env (
    echo [ERROR] .env 파일이 없습니다.
    echo [ERROR] .env.example 을 참고해 .env 파일을 생성해주세요.
    pause
    exit /b 1
)

:: Alembic 마이그레이션 실행
echo [setup] DB 마이그레이션 실행 중...
cd backend
alembic upgrade head
cd ..

:: FastAPI 서버 시작
echo.
echo [info] http://localhost:8000 에서 서버 시작합니다...
echo [info] 종료하려면 Ctrl+C 를 누르세요.
echo.
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
