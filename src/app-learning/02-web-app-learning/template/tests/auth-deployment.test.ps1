# Offline regression: replace every Render HTTP request with a local fake.
$ErrorActionPreference = 'Stop'
$webRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$fake = @{
    RENDER_API_KEY='rnd_offline_example'; DB_HOST='offline.pooler.supabase.com'
    SPRING_DATASOURCE_USERNAME='offline'; SPRING_DATASOURCE_PASSWORD='offline'
    RENDER_DB_SCHEMA=''; APP_AUTH_ENABLED='true'; APP_AUTH_HOME='/'
    SUPABASE_AUTH_URL='https://auth-example.supabase.co'
    SUPABASE_AUTH_PUBLISHABLE_KEY='sb_publishable_example'
    APP_AUTH_CALLBACK_URL='https://app-example.onrender.com/auth/callback'
}
$previous = @{}
foreach ($key in $fake.Keys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key,'Process') }
$global:authReviewWrites = @{}
function Invoke-RestMethod {
    param($Method,$Uri,$Headers,$ContentType,$Body)
    if ($Method -eq 'Get' -and $Uri -like 'https://api.render.com/v1/services?name=*') {
        return @(@{service=@{id='srv-offline';serviceDetails=@{url='https://app-example.onrender.com'}}})
    }
    if ($Method -eq 'Put' -and $Uri -like 'https://api.render.com/v1/services/srv-offline/env-vars/*') {
        $global:authReviewWrites[$Uri.Split('/')[-1]] = ($Body | ConvertFrom-Json).value
        return @{}
    }
    throw 'Unexpected HTTP request in offline Render test.'
}
try {
    foreach ($app in @('template','cast-evaluation','english-trainer','online-shop','photo-diary','skill-janken-game')) {
        $fake['RENDER_DB_SCHEMA'] = if ($app -eq 'template') {'app_template_authreview'} else {$app.Replace('-','_')+'_authreview'}
        foreach ($key in $fake.Keys) { [Environment]::SetEnvironmentVariable($key,$fake[$key],'Process') }
        $global:authReviewWrites = @{}
        & (Join-Path $webRoot "$app/scripts/render.ps1") env | Out-Null
        foreach ($key in @('APP_AUTH_ENABLED','SUPABASE_AUTH_URL','SUPABASE_AUTH_PUBLISHABLE_KEY','APP_AUTH_CALLBACK_URL','APP_AUTH_HOME')) {
            if ($global:authReviewWrites[$key] -cne $fake[$key]) { throw "Auth setting missing from deployment: $app $key" }
        }
        $global:authReviewWrites = @{}
        [Environment]::SetEnvironmentVariable('APP_AUTH_CALLBACK_URL','http://localhost:8080/auth/callback','Process')
        $rejected = $false
        try { & (Join-Path $webRoot "$app/scripts/render.ps1") env | Out-Null } catch { $rejected=$true }
        if (-not $rejected -or $global:authReviewWrites.Count -ne 0) { throw "Invalid callback caused partial deployment: $app" }
    }
    Write-Output 'PASS: 6 apps send Auth settings; invalid callback rejected before any environment write (12 offline checks).'
} finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key,$previous[$key],'Process') }
    Remove-Item Function:Invoke-RestMethod
    Remove-Variable authReviewWrites -Scope Global -ErrorAction SilentlyContinue
}
