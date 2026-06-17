"""HRD 전환 어시스턴트 실행 진입점 (소스 실행 + PyInstaller exe 공용).

하는 일:
1. DB 마이그레이션 자동 적용 (없으면 courses 테이블 생성)
2. 기본 브라우저로 http://localhost:8000 자동 열기
3. FastAPI 서버 기동

exe로 패키징하면 Python 설치 없이 더블클릭으로 실행된다.
"""
import multiprocessing
import threading
import time
import webbrowser

HOST = "127.0.0.1"
PORT = 8000
URL = f"http://localhost:{PORT}"


def _run_migrations() -> None:
    """alembic 마이그레이션을 프로그램적으로 적용한다 (idempotent)."""
    from alembic import command
    from alembic.config import Config

    from backend.app.paths import bundle_base

    alembic_dir = bundle_base() / "backend" / "alembic"
    cfg = Config()
    cfg.set_main_option("script_location", str(alembic_dir))
    # sqlalchemy.url 은 env.py 가 get_db_path()로 주입하므로 여기서 지정하지 않는다.
    command.upgrade(cfg, "head")


def _open_browser() -> None:
    time.sleep(1.5)
    try:
        webbrowser.open(URL)
    except Exception:
        pass


def main() -> None:
    print("=" * 50)
    print(" HRD 전환 어시스턴트")
    print("=" * 50)
    print("[1/2] DB 준비 중...")
    try:
        _run_migrations()
    except Exception as exc:  # noqa: BLE001
        print(f"  [경고] DB 마이그레이션 실패: {exc}")

    threading.Thread(target=_open_browser, daemon=True).start()

    print(f"[2/2] 서버 시작: {URL}")
    print()
    print(" 브라우저가 자동으로 열립니다.")
    print(" 종료하려면 이 창을 닫거나 Ctrl+C 를 누르세요.")
    print("=" * 50)

    import uvicorn

    from backend.app.main import app

    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
