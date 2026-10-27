param(
    [ValidateSet('test', 'run', 'stop', 'package', 'seed-preview', 'seed', 'seed-reset', 'seed-cleanup', 'seed-images')]
    [string]$Action = 'run',
    [string]$SecretsFile,
    [switch]$Images,
    [ValidateRange(1, 65535)]
    [int]$Port = 8095
)

$ErrorActionPreference = 'Stop'
if ($Action -eq 'stop') {
    & (Join-Path $PSScriptRoot 'scripts/stop-port.ps1') -Port $Port
    exit 0
}
. (Join-Path $PSScriptRoot 'scripts/Read-DotEnv.ps1')
$settings = Read-DotEnv -Path (Join-Path $PSScriptRoot '.env')
# Optional shared credentials are read into this process, never copied to app files.
if ($SecretsFile) {
    $shared=Read-DotEnv -Path $SecretsFile
    foreach($name in @('DB_HOST','DB_PORT','DB_NAME','SPRING_DATASOURCE_USERNAME','SPRING_DATASOURCE_PASSWORD','SUPABASE_URL','SUPABASE_SECRET_KEY','GEMINI_API_KEY')) {
        if(-not $settings.ContainsKey($name) -and $shared.ContainsKey($name)) { $settings[$name]=$shared[$name] }
    }
    $shared.Clear()
}

$allowed = @('DB_HOST', 'DB_PORT', 'DB_NAME', 'SPRING_DATASOURCE_URL',
    'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'SUPABASE_URL',
    'SUPABASE_SECRET_KEY', 'SUPABASE_STORAGE_BUCKET', 'APP_IMAGES_ENABLED',
    'APP_DB_SCHEMA', 'SERVER_PORT', 'APP_ENVIRONMENT', 'AI_GEMINI_API_KEY', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_TIMEOUT', 'APP_AI_MODE')
# Read by scripts/render.ps1 only; never passed to the app.
$deployOnly = @('RENDER_API_KEY', 'RENDER_DB_SCHEMA')
foreach ($name in @($settings.Keys)) {
    if ($name -in $deployOnly) { $settings.Remove($name); continue }
    if ($name -notin $allowed) { throw "Unsupported .env key: $name" }
}
# Existing process environment wins over the local file.
foreach ($name in $allowed) {
    $existing = [Environment]::GetEnvironmentVariable($name, 'Process')
    if ($null -ne $existing) { $settings[$name] = $existing }
}
foreach ($name in @('SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD')) {
    if ([string]::IsNullOrWhiteSpace($settings[$name])) {
        throw "Set $name in .env or the process environment. See .env.example."
    }
}
if ([string]::IsNullOrWhiteSpace($settings['SPRING_DATASOURCE_URL'])) {
    if ($settings['DB_HOST'] -notmatch '^[a-z0-9-]+\.pooler\.supabase\.com$') {
        throw 'Set DB_HOST to the Supabase Session pooler host in .env.'
    }
    if (-not $settings['DB_PORT']) { $settings['DB_PORT'] = '5432' }
    if (-not $settings['DB_NAME']) { $settings['DB_NAME'] = 'postgres' }
    if ($settings['DB_PORT'] -ne '5432' -or $settings['DB_NAME'] -ne 'postgres') {
        throw 'Use the Session pooler port 5432 and database postgres.'
    }
    $rootCert = Join-Path $PSScriptRoot 'certs/prod-ca-2021.crt'
    if (-not (Test-Path -LiteralPath $rootCert -PathType Leaf)) {
        throw 'The Supabase CA certificate is missing from certs/prod-ca-2021.crt.'
    }
    $settings['SPRING_DATASOURCE_URL'] = 'jdbc:postgresql://{0}:5432/postgres?sslmode=verify-full&sslrootcert={1}&connectTimeout=10&socketTimeout=30' -f $settings['DB_HOST'], [uri]::EscapeDataString($rootCert)
}
if ($PSBoundParameters.ContainsKey('Images')) {
    $settings['APP_IMAGES_ENABLED'] = $Images.IsPresent.ToString().ToLowerInvariant()
}
if (-not $settings['APP_DB_SCHEMA']) { $settings['APP_DB_SCHEMA']='skill_janken_game' }
if (-not $settings['SERVER_PORT']) { $settings['SERVER_PORT']='8095' }
# Both test and package execute tests; always isolate them from normal app data.
if ($Action -in @('test', 'package')) { $settings['APP_DB_SCHEMA'] = 'skill_janken_game_test' }
if ($Action -like 'seed*' -and $settings['APP_DB_SCHEMA'] -and $settings['APP_DB_SCHEMA'] -notin @('skill_janken_game', 'skill_janken_game_seed_test')) {
    throw 'Seed commands only support the skill_janken_game or skill_janken_game_seed_test development schema.'
}
if ($settings['APP_DB_SCHEMA'] -and $settings['APP_DB_SCHEMA'] -notmatch '^[a-z][a-z0-9_]{0,62}$') {
    throw 'APP_DB_SCHEMA must be a lowercase SQL identifier.'
}
if ($settings['APP_IMAGES_ENABLED'] -and $settings['APP_IMAGES_ENABLED'] -notin @('true', 'false')) {
    throw 'APP_IMAGES_ENABLED must be true or false.'
}
# APP_IMAGES_ENABLED only seeds a new schema. Persisted feature settings take precedence.
# Missing Storage credentials are reported in the management UI; text posts remain usable.
$previous = @{}
foreach ($name in $settings.Keys) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
$result = 1
Push-Location $PSScriptRoot
try {
    foreach ($name in $settings.Keys) {
        [Environment]::SetEnvironmentVariable($name, $settings[$name], 'Process')
    }
    $goal = switch ($Action) {
        'test' { 'test' }
        'package' { 'package' }
        'run' { 'spring-boot:run' }
    }
    if ($Action -like 'seed*') {
        $seedAction = switch ($Action) {
            'seed-preview' { 'preview' }
            'seed' { 'add' }
            'seed-reset' { 'reset' }
            'seed-cleanup' { 'cleanup' }
            'seed-images' { 'images' }
        }
        & (Join-Path $PSScriptRoot 'mvnw.cmd') -B spring-boot:run "-Dspring-boot.run.arguments=--seed.action=$seedAction --server.port=0"
    } else {
        & (Join-Path $PSScriptRoot 'mvnw.cmd') -B $goal
    }
    $result = $LASTEXITCODE
} finally {
    foreach ($name in $settings.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
    }
    $settings.Clear()
    $previous.Clear()
    Pop-Location
}
exit $result
