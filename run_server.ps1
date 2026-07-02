$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$portsToTry = 8080, 8000, 8888, 9000, 10000

function Start-LocalServer {
    param($port)
    $prefix = "http://127.0.0.1:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    return $listener
}

function Open-Browser {
    param($url)
    Write-Host "Membuka browser: $url"
    Start-Process $url
}

$listener = $null
$serverPort = $null

foreach ($port in $portsToTry) {
    try {
        $listener = Start-LocalServer -port $port
        $serverPort = $port
        break
    } catch {
        Write-Host "Port $port tidak tersedia: $($_.Exception.Message)"
    }
}

if ($listener) {
    $url = "http://127.0.0.1:$serverPort/camera_tracking_browser.html"
    Write-Host "Server lokal berjalan di $url"
    Open-Browser -url $url
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
    exit 0
}

Write-Host "ERROR: Semua port gagal digunakan. Tutup aplikasi lain yang menggunakan port 8080, 8000, 8888, 9000, atau 10000 lalu coba lagi." -ForegroundColor Red
exit 1
