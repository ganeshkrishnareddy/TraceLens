$ErrorActionPreference = 'Continue'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$routes = @(
    @{ Route = '/'; Expected = 'Overview' },
    @{ Route = '/data'; Expected = 'Data Lab' },
    @{ Route = '/detect'; Expected = 'Anomaly Detection' },
    @{ Route = '/investigate'; Expected = 'Investigation' },
    @{ Route = '/explain'; Expected = 'Explainability' },
    @{ Route = '/experiments'; Expected = 'Experiment Lab' },
    @{ Route = '/reports'; Expected = 'Reports' },
    @{ Route = '/about'; Expected = 'About & Methodology' }
)
$results = @()
foreach ($r in $routes) {
    $profile = Join-Path $env:TEMP ('tracelens_dom_' + [guid]::NewGuid().ToString('N'))
    $dom = Join-Path $env:TEMP ('tracelens_dom_' + [guid]::NewGuid().ToString('N') + '.html')
    $args = @(
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        "--user-data-dir=$profile",
        '--virtual-time-budget=12000',
        '--dump-dom',
        ('http://127.0.0.1:5173' + $r.Route)
    )
    & $chrome @args 2>$null | Set-Content -LiteralPath $dom -Encoding UTF8
    $text = Get-Content -LiteralPath $dom -Raw
    $h1 = 'MISSING'
    if ($text -match '<h1[^>]*>(.*?)</h1>') {
        $h1 = [System.Net.WebUtility]::HtmlDecode(($matches[1] -replace '<[^>]+>', '')).Trim()
    }
    $results += [pscustomobject]@{
        Route = $r.Route
        Expected = $r.Expected
        H1 = $h1
        Offline = $text.Contains('Backend is offline')
        Bytes = (Get-Item -LiteralPath $dom).Length
    }
}
$results | Format-Table -AutoSize
