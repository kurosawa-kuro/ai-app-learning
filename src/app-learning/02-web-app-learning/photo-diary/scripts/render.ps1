param(
    [Parameter(Position = 0)]
    [ValidateSet('status', 'deploy', 'suspend', 'resume', 'env')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-DotEnv.ps1')
$root = Split-Path $PSScriptRoot -Parent
$settings = Read-DotEnv -Path (Join-Path $root '.env')
# Existing process environment wins over the local file, as in run-local.ps1.
foreach ($name in @('RENDER_API_KEY', 'DB_HOST', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'RENDER_DB_SCHEMA', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_TIMEOUT', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_STORAGE_BUCKET')) {
    $existing = [Environment]::GetEnvironmentVariable($name, 'Process')
    if ($null -ne $existing) { $settings[$name] = $existing }
}
if ($settings['RENDER_API_KEY'] -notlike 'rnd_*') {
    throw 'Set RENDER_API_KEY in .env or the process environment. See .env.example.'
}
$serviceName = 'learning-photo-diary'  # Same as render.yaml.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$headers = @{ Authorization = "Bearer $($settings['RENDER_API_KEY'])"; Accept = 'application/json' }

function Invoke-Render([string]$Method, [string]$Path, $Body) {
    $request = @{ Method = $Method; Uri = "https://api.render.com/v1$Path"; Headers = $headers }
    if ($Method -ne 'Get') {
        $request.ContentType = 'application/json'
        $request.Body = if ($null -ne $Body) { $Body | ConvertTo-Json -Compress } else { '{}' }
    }
    Invoke-RestMethod @request
}

$service = @(Invoke-Render Get "/services?name=$serviceName&limit=1") | ForEach-Object { $_.service }
if (-not $service) { throw "Render service '$serviceName' was not found." }
$serviceId = $service.id
$url = $service.serviceDetails.url

function Get-LatestDeploy { @(Invoke-Render Get "/services/$serviceId/deploys?limit=1")[0].deploy }

function Wait-Deploy([string]$DeployId) {
    $last = ''
    for ($i = 0; $i -lt 90; $i++) {
        $status = (Invoke-Render Get "/services/$serviceId/deploys/$DeployId").status
        if ($status -ne $last) { Write-Output "$(Get-Date -Format HH:mm:ss) $status"; $last = $status }
        if ($status -eq 'live') { return }
        if ($status -match 'failed|canceled|deactivated') { throw "Deploy $DeployId ended as $status. See Logs in the Render Dashboard." }
        Start-Sleep -Seconds 10
    }
    throw "Deploy $DeployId did not finish within 15 minutes."
}

function Test-Page {
    # A resumed or freshly deployed free instance can take minutes to answer.
    for ($i = 0; $i -lt 12; $i++) {
        try {
            $code = (Invoke-WebRequest -Uri "$url/healthz" -UseBasicParsing -TimeoutSec 30).StatusCode
            if ($code -eq 200) { Write-Output "GET $url/ -> 200"; return }
        } catch { }
        Start-Sleep -Seconds 10
    }
    throw "$url/healthz did not return 200 within about 8 minutes."
}

switch ($Action) {
    'status' {
        $deploy = Get-LatestDeploy
        Write-Output "service   $serviceName ($serviceId)"
        Write-Output "url       $url"
        Write-Output "suspended $($service.suspended)"
        Write-Output "deploy    $($deploy.status) $($deploy.commit.id.Substring(0, 7)) $($deploy.finishedAt)"
    }
    'deploy' {
        if ($service.suspended -ne 'not_suspended') { throw 'The service is suspended. Run resume first.' }
        # Render builds the pushed branch, so unpushed commits would silently be missing.
        git -C $root fetch -q origin
        git -C $root merge-base --is-ancestor HEAD "origin/$($service.branch)"
        if ($LASTEXITCODE -ne 0) { throw "HEAD is not on origin/$($service.branch). Push first." }
        if (git -C $root status --porcelain -- .) { Write-Warning 'Uncommitted changes in this folder are not deployed.' }
        $deploy = Invoke-Render Post "/services/$serviceId/deploys"
        Wait-Deploy $deploy.id
        Test-Page
    }
    'suspend' {
        Invoke-Render Post "/services/$serviceId/suspend" | Out-Null
        Write-Output "Suspended $serviceName."
    }
    'resume' {
        Invoke-Render Post "/services/$serviceId/resume" | Out-Null
        # Resume restarts the last deploy without creating a new one.
        Write-Output "Resumed $serviceName. Waiting for the page..."
        Test-Page
    }
    'env' {
        # Validate all inputs before changing any remote environment variable.
        foreach ($name in @('DB_HOST', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'RENDER_DB_SCHEMA')) {
            if ([string]::IsNullOrWhiteSpace($settings[$name])) { throw "Set $name in .env or the process environment." }
        }
        if ($settings['RENDER_DB_SCHEMA'] -notmatch '^photo_diary_[a-z0-9_]+$' -or $settings['RENDER_DB_SCHEMA'] -match 'test|e2e|restore') { throw 'Choose a dedicated production RENDER_DB_SCHEMA.' }
        $deployment = @{
            DB_HOST = $settings['DB_HOST']
            SPRING_DATASOURCE_USERNAME = $settings['SPRING_DATASOURCE_USERNAME']
            SPRING_DATASOURCE_PASSWORD = $settings['SPRING_DATASOURCE_PASSWORD']
            APP_ENVIRONMENT = 'production'
            APP_DB_SCHEMA = $settings['RENDER_DB_SCHEMA']
        }
        foreach ($name in @('GEMINI_API_KEY','GEMINI_MODEL','GEMINI_TIMEOUT','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_STORAGE_BUCKET')) {
            if (-not [string]::IsNullOrWhiteSpace($settings[$name])) { $deployment[$name] = $settings[$name] }
        }
        foreach ($name in $deployment.Keys) {
            Invoke-Render Put "/services/$serviceId/env-vars/$name" @{ value = $deployment[$name] } | Out-Null
            Write-Output "Updated $name."
        }
        Write-Output 'Run deploy to apply the new values.'
    }
}
