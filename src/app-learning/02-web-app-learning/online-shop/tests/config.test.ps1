$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/Read-DotEnv.ps1')
$testPath = [IO.Path]::GetTempFileName()
try {
    $sample = @'
# Comment
PASSWORD='a$literal#part=x y'
QUOTED=" leading and trailing "
EMPTY=
RAW=a=b#c
'@
    [IO.File]::WriteAllText($testPath, $sample)
    $config = Read-DotEnv -Path $testPath
    if ($config['PASSWORD'] -cne 'a$literal#part=x y' -or
        $config['QUOTED'] -cne ' leading and trailing ' -or
        $config['EMPTY'] -cne '' -or $config['RAW'] -cne 'a=b#c') {
        throw 'Literal dotenv values were changed.'
    }
    foreach ($invalid in @("A=one`nA=two", 'BAD LINE', 'A="unclosed')) {
        [IO.File]::WriteAllText($testPath, $invalid)
        $rejected = $false
        try { Read-DotEnv -Path $testPath | Out-Null } catch { $rejected = $true }
        if (-not $rejected) { throw 'Invalid dotenv input was accepted.' }
    }
    Write-Output 'dotenv parser checks passed'
} finally {
    Remove-Item -LiteralPath $testPath
}
