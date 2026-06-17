# -*- mode: python ; coding: utf-8 -*-
# HRD 전환 어시스턴트 단일 실행파일(.exe) 빌드 스펙.
# 빌드: ./scripts/build-exe.ps1  (또는 pyinstaller --distpath release --workpath build_pyi hrd-assistant.spec)
from PyInstaller.utils.hooks import collect_all, collect_submodules

# 번들에 포함할 읽기 전용 리소스: 빌드된 프론트(dist), alembic 마이그레이션
_datas = [("dist", "dist"), ("backend/alembic", "backend/alembic")]
_binaries = []
_hidden = ["backend.app.main"]

# 함수 내부 지연 import(anthropic 등)나 동적 로딩 패키지를 통째로 수집
for _pkg in [
    "anthropic",
    "httpx",
    "certifi",
    "pandas",
    "openpyxl",
    "uvicorn",
    "alembic",
    "sqlalchemy",
    "pydantic",
]:
    _d, _b, _h = collect_all(_pkg)
    _datas += _d
    _binaries += _b
    _hidden += _h

_hidden += collect_submodules("uvicorn")

a = Analysis(
    ["launcher.py"],
    pathex=[],
    binaries=_binaries,
    datas=_datas,
    hiddenimports=_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "pytest", "IPython"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="HRD-Assistant",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="HRD-Assistant",
)
