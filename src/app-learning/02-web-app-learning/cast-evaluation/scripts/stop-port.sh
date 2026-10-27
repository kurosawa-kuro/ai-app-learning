#!/usr/bin/env bash
# Git Bash entry point: stop the listener on the requested Windows TCP port.
set -euo pipefail
cd "$(dirname "$0")/.."
port="${1:-8080}"
if (( $# )); then shift; fi
exec powershell.exe -NoProfile -File ./scripts/stop-port.ps1 -Port "$port" "$@"
