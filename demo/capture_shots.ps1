$ErrorActionPreference = 'Stop'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$demo = 'D:\PROVISION_TRACELENS\demo'
$shots = Join-Path $demo 'shots'
New-Item -ItemType Directory -Force -Path $shots | Out-Null

function Capture([string]$url, [string]$out, [int]$width, [int]$height, [int]$budget) {
    $profile = Join-Path $env:TEMP ('tracelens_shot_' + [guid]::NewGuid().ToString('N'))
    $args = @(
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        "--user-data-dir=$profile",
        "--window-size=$width,$height",
        '--force-device-scale-factor=1',
        "--virtual-time-budget=$budget",
        "--screenshot=$out",
        $url
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $chrome @args 2>$null | Out-Null } finally { $ErrorActionPreference = $previous }
    if (-not (Test-Path -LiteralPath $out)) { throw "Screenshot failed: $out" }
}

Capture 'file:///D:/PROVISION_TRACELENS/demo/slates/title.html' (Join-Path $shots '00_title.png') 1280 720 2000

$pages = @(
    @{ Name = '01_overview'; Url = 'http://127.0.0.1:5173/' },
    @{ Name = '02_data'; Url = 'http://127.0.0.1:5173/data' },
    @{ Name = '03_detection'; Url = 'http://127.0.0.1:5173/detect' },
    @{ Name = '04_investigation'; Url = 'http://127.0.0.1:5173/investigate' },
    @{ Name = '05_explainability'; Url = 'http://127.0.0.1:5173/explain' },
    @{ Name = '06_experiments'; Url = 'http://127.0.0.1:5173/experiments' },
    @{ Name = '07_reports'; Url = 'http://127.0.0.1:5173/reports' },
    @{ Name = '08_about'; Url = 'http://127.0.0.1:5173/about' }
)
foreach ($p in $pages) {
    $out = Join-Path $shots ($p.Name + '.png')
    Capture $p.Url $out 1440 900 12000
    Write-Output ("{0} -> {1}" -f $p.Name, $out)
}

Capture 'file:///D:/PROVISION_TRACELENS/demo/slates/closing.html' (Join-Path $shots '09_closing.png') 1280 720 2000
Write-Output 'Done.'
