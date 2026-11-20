$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$demo = 'D:\PROVISION_TRACELENS\demo'
$audioDir = Join-Path $demo 'audio'
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$lines = Get-Content -LiteralPath (Join-Path $demo 'narration.txt') | Where-Object { $_.Trim() -ne '' }
if ($lines.Count -ne 8) { throw "Expected 8 narration lines, found $($lines.Count)." }

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq 'Microsoft David Desktop' } | Select-Object -First 1
if ($null -eq $voice) { throw 'Microsoft David Desktop voice is not installed.' }
$synth.SelectVoice('Microsoft David Desktop')
$synth.Rate = 0
$synth.Volume = 100

for ($i = 0; $i -lt $lines.Count; $i++) {
    $n = $i + 1
    $out = Join-Path $audioDir ('{0:D2}_scene.wav' -f $n)
    $synth.SetOutputToWaveFile($out)
    $synth.Speak($lines[$i])
    Write-Output ("{0} -> {1}" -f $n, $out)
}
$synth.SetOutputToNull()
$synth.Dispose()
