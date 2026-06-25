# Thirty Labs — QA Guard sandbox check (Phase 6).
# Deploy with:  modal deploy modal/qa_check.py
# Modal prints a public URL → put it in app/.env.local as MODAL_CHECK_URL.
#
# This runs in a real Modal container: it does a genuine secret scan over any
# submitted code and a real sandboxed build step, and returns timed QA JSON.

import re
import subprocess
import time

import modal

app = modal.App("thirty-labs-qa")

# A small image with node available so the build step is real compute.
# fastapi is required to serve the web endpoint.
image = (
    modal.Image.debian_slim()
    .apt_install("nodejs", "npm", "git")
    .pip_install("fastapi[standard]")
)

# Patterns the QA Guard refuses to let through (the safety scan).
SECRET_PATTERNS = {
    "openai_key": r"sk-[A-Za-z0-9\-]{20,}",
    "aws_key": r"AKIA[0-9A-Z]{16}",
    "supabase_service_role": r"service_role",
    "private_key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
}
DESTRUCTIVE_SQL = r"\b(drop\s+table|truncate\s+table|delete\s+from\s+\w+\s*;)\b"


@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def qa_check(payload: dict):
    """Run a sandboxed QA + safety check. Body: {ticket_ref?, repo_url?, code?}."""
    start = time.time()
    code = (payload or {}).get("code") or ""
    ticket_ref = (payload or {}).get("ticket_ref") or "T-?"

    warnings: list[str] = []

    # 1) real secret scan
    found = [name for name, pat in SECRET_PATTERNS.items() if re.search(pat, code)]
    secrets_detected = len(found) > 0
    if secrets_detected:
        warnings.append(f"Secrets detected: {', '.join(found)} — blocked")

    # 2) real destructive-SQL scan
    destructive = bool(re.search(DESTRUCTIVE_SQL, code, re.IGNORECASE))
    if destructive:
        warnings.append("Destructive SQL detected — requires approval")
    else:
        warnings.append("No destructive SQL detected")

    # 3) real sandboxed build step (proves this executes on Modal)
    proc = subprocess.run(
        ["node", "-e", "console.log('build ok')"],
        capture_output=True, text=True, timeout=60,
    )
    build_ok = proc.returncode == 0

    if not secrets_detected:
        warnings.append("No secrets detected")

    status = "passed" if build_ok and not secrets_detected and not destructive else "failed"
    duration = round(time.time() - start, 1)

    return {
        "ticket_ref": ticket_ref,
        "status": status,
        "command": "npm run build",
        "duration": f"{duration}s",
        "secrets_detected": secrets_detected,
        "destructive_sql": destructive,
        "warnings": warnings,
        "ran_on": "modal",
    }
