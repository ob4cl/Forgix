# {{projectName}}

If a packed Forgix CLI omitted `.gitignore`, copy the bundled `_gitignore`
to `.gitignore` before committing your project (`cp _gitignore .gitignore`,
or `Copy-Item _gitignore .gitignore` in PowerShell). The pack-safe fallback
is provided because npm excludes `.gitignore` from archives; automatic
materialization needs the pending CLI integration. Source-checkout generation
already includes `.gitignore`. Remove `_gitignore` after copying if desired.

A minimal FastAPI HTTP application. Python 3.10+ is required; Python 3.12 is
used by the repository verification script. No database or authentication is included.

## Setup

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m unittest discover -s tests -v
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

On Windows activate with `.venv\Scripts\Activate.ps1` in PowerShell instead.
If using uv, `uv venv --python 3.12` then
`uv pip install -r requirements.txt -r requirements-dev.txt` is an alternative.
Forgix does not install Python requirements automatically.

GET `/` returns the project greeting. GET `/health` returns `{"status":"ok"}`.
Browse http://127.0.0.1:8000/docs for interactive OpenAPI documentation.
For development, add `--reload` to the uvicorn command.
Production needs a deployment plan, HTTPS, validation, logging and any
application-specific authentication; this starter does not provide them.

## Testing

Tests use FastAPI TestClient in-process (no listening socket) to check the
root response, health response, unknown route and OpenAPI metadata/paths.
`requirements-dev.txt` adds HTTPX solely for those tests.
Runtime dependencies are exactly pinned; transitives are not hash-locked.
The verifier installs wheels only, with no source builds or remote hooks.
Edit `main.py` to add routes; keep local secrets in ignored `.env` files.
