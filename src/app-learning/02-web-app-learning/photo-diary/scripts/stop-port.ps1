[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Low')]
param(
    [Parameter(Position = 0)]
    [ValidateRange(1, 65535)]
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
if ($listeners.Count -eq 0) {
    Write-Output "Port $Port is already free."
    return
}

$processIds = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($processIdToStop in $processIds) {
    if ($processIdToStop -in @(0, 4, $PID)) { throw "Cannot stop protected process $processIdToStop." }
    $targetProcess = Get-Process -Id $processIdToStop -ErrorAction SilentlyContinue
    if (-not $targetProcess) { continue }
    # Recheck ownership immediately before terminating to avoid stopping a reused PID.
    $stillListening = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -eq $processIdToStop })
    if ($stillListening.Count -eq 0) { continue }
    if ($PSCmdlet.ShouldProcess("$($targetProcess.ProcessName) (PID $processIdToStop)", "Force-stop listener on port $Port")) {
        Stop-Process -Id $processIdToStop -Force
        Write-Output "Stopped $($targetProcess.ProcessName) (PID $processIdToStop) on port $Port."
    }
}

if (-not $WhatIfPreference) {
    $remaining = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    if ($remaining.Count -gt 0) { throw "Port $Port is still in use. Check the process and permissions." }
    Write-Output "Port $Port is free."
}
