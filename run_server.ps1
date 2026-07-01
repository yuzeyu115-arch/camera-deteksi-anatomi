$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = 'http://+:8080/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Write-Host "ERROR: Tidak dapat memulai server pada $prefix."
    Write-Host "Pesan kesalahan: $($_.Exception.Message)"
    Write-Host "Jika Anda tidak menjalankan PowerShell sebagai administrator, jalankan perintah ini dahulu:" 
    Write-Host "  netsh http add urlacl url=http://+:8080/ user=Everyone"
    Write-Host "Lalu jalankan kembali skrip ini."
    exit 1
}
Write-Host "Serving $root at $prefix"
Write-Host "Akses halaman di browser lokal: http://localhost:8080/camera_tracking_browser.html"
Write-Host "Jika menggunakan ngrok, jalankan: ngrok http 8080"
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