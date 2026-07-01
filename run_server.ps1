$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = 'http://localhost:8000/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root at $prefix"
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = 'camera_tracking_browser.html' }
    $path = Join-Path $root $requestPath
    if (-not (Test-Path $path)) {
        $context.Response.StatusCode = 404
        $context.Response.Close()
        continue
    }
    $mime = switch ([IO.Path]::GetExtension($path).ToLower()) {
        '.html' { 'text/html' }
        '.js' { 'application/javascript' }
        '.css' { 'text/css' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.svg' { 'image/svg+xml' }
        '.json' { 'application/json' }
        default { 'application/octet-stream' }
    }
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $context.Response.ContentType = $mime
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.OutputStream.Close()
}
$listener.Stop()