#!/usr/bin/env bash
# Git Bash entry point. Usage: ./scripts/render.sh status|deploy|suspend|resume|env
set -euo pipefail
cd "$(dirname "$0")"
exec powershell.exe -NoProfile -File ./render.ps1 "$@"
