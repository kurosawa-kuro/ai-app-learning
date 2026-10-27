param(
    [ValidateSet('test', 'run', 'package')]
    [string]$Action = 'run',
    [switch]$Images
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/Read-DotEnv.ps1')
$settings = Read-DotEnv -Path (Join-Path $PSScriptRoot '.env')
$allowed = @('DB_HOST', 'DB_PORT', 'DB_NAME', 'SPRING_DATASOURCE_URL',
    'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'SUPABASE_URL',
    'SUPABASE_SECRET_KEY', 'SUPABASE_STORAGE_BUCKET', 'APP_IMAGES_ENABLED',
    'APP_DB_SCHEMA', 'SERVER_PORT')
foreach ($name in @($settings.Keys)) {
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
# Both test and package execute tests; always isolate them from normal app data.
if ($Action -in @('test', 'package')) { $settings['APP_DB_SCHEMA'] = 'app_template_test' }
if ($settings['APP_DB_SCHEMA'] -and $settings['APP_DB_SCHEMA'] -notmatch '^[a-z][a-z0-9_]{0,62}$') {
    throw 'APP_DB_SCHEMA must be a lowercase SQL identifier.'
}
if ($settings['APP_IMAGES_ENABLED'] -and $settings['APP_IMAGES_ENABLED'] -notin @('true', 'false')) {
    throw 'APP_IMAGES_ENABLED must be true or false.'
}
if ($settings['APP_IMAGES_ENABLED'] -eq 'true' -and
    ([string]::IsNullOrWhiteSpace($settings['SUPABASE_URL']) -or
     $settings['SUPABASE_SECRET_KEY'] -notlike 'sb_secret_*')) {
    throw 'Images require SUPABASE_URL and SUPABASE_SECRET_KEY in .env or the environment.'
}
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
    & (Join-Path $PSScriptRoot 'mvnw.cmd') -B $goal
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
