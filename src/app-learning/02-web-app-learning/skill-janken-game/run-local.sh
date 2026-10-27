#!/usr/bin/env bash
# Git Bash entry point. .env handling lives in run-local.ps1; arguments pass through unchanged.
set -euo pipefail
cd "$(dirname "$0")"
exec powershell.exe -NoProfile -File ./run-local.ps1 "$@"
