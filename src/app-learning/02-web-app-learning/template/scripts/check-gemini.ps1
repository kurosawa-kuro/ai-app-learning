# Use the running application's policy-protected endpoint, never the Gateway directly.
param([ValidateRange(1,65535)][int]$Port = 8080)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$geminiRoot = "http://127.0.0.1:$Port"
try {
    $page = Invoke-WebRequest -UseBasicParsing -Uri "$geminiRoot/admin/ai" -SessionVariable geminiSession -TimeoutSec 10
    $tokens = @{}
    foreach ($inputTag in [regex]::Matches($page.Content, '<input[^>]+>')) {
        $name = [regex]::Match($inputTag.Value, 'name="([^"]+)"').Groups[1].Value
        $value = [regex]::Match($inputTag.Value, 'value="([^"]*)"').Groups[1].Value
        if ($name -in @('_csrf','requestToken')) { $tokens[$name] = [System.Net.WebUtility]::HtmlDecode($value) }
    }
    if (-not $tokens['_csrf'] -or -not $tokens['requestToken']) { throw 'Connection page is unavailable.' }
    $result = Invoke-WebRequest -UseBasicParsing -Uri "$geminiRoot/admin/ai/check" -Method Post -Body $tokens -WebSession $geminiSession -TimeoutSec 75
    $section = [regex]::Match($result.Content, '(?s)<article[^>]*id="ai-check-result"[^>]*>.*?</article>').Value
    $message = [regex]::Match($section, '(?s)<p[^>]*>([^<]*)</p>').Groups[1].Value
    if (-not $message) { throw 'No check result returned.' }
    Write-Output ([System.Net.WebUtility]::HtmlDecode($message))
    if ($section -match '<h2[^>]*>接続できました</h2>') { exit 0 }
    exit 1
} catch {
    # Do not dump response bodies, session tokens or upstream diagnostics.
    Write-Output '接続確認を完了できませんでした。ローカルアプリを起動し、管理画面の設定を確認してください。'
    exit 1
}
