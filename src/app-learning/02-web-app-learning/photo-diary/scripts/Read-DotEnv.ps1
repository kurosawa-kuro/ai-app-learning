function Read-DotEnv {
    param([Parameter(Mandatory = $true)][string]$Path)
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $values }
    $lineNumber = 0
    foreach ($line in [IO.File]::ReadAllLines($Path)) {
        $lineNumber++
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) { continue }
        if ($trimmed -notmatch '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            throw "Invalid .env syntax at line $lineNumber. Use KEY=value."
        }
        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if ($values.ContainsKey($name)) { throw "Duplicate .env key at line $lineNumber." }
        if ($value.StartsWith('"') -or $value.StartsWith("'")) {
            $quote = $value.Substring(0, 1)
            if ($value.Length -lt 2 -or -not $value.EndsWith($quote)) {
                throw "Unclosed .env quote at line $lineNumber."
            }
            $value = $value.Substring(1, $value.Length - 2)
        }
        # Deliberately no Invoke-Expression, interpolation, escaping or inline comment removal.
        $values[$name] = $value
    }
    return $values
}
