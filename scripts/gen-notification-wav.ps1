$dir = "C:\Users\PC\Desktop\MVP\dcs-front\public\assets\audio"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$path = Join-Path $dir "notification.wav"

$sampleRate = 44100
$bitsPerSample = 16
$channels = 1

$tones = @(
    @{ Freq = 587.33; Ms = 120 },
    @{ Freq = 880.00; Ms = 280 }
)
$gapMs = 20

$samples = New-Object 'System.Collections.Generic.List[Int16]'
foreach ($t in $tones) {
    $n = [int]($sampleRate * $t.Ms / 1000)
    for ($i = 0; $i -lt $n; $i++) {
        $envelope = [Math]::Exp(-3.5 * $i / $n)
        $val = [Math]::Sin(2 * [Math]::PI * $t.Freq * $i / $sampleRate) * $envelope * 22000
        $samples.Add([Int16]$val)
    }
    $gap = [int]($sampleRate * $gapMs / 1000)
    for ($j = 0; $j -lt $gap; $j++) { $samples.Add([Int16]0) }
}

$dataSize = $samples.Count * 2
$fileSize = 36 + $dataSize

$fs = [System.IO.File]::Open($path, 'Create')
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF'))
$bw.Write([int]$fileSize)
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('WAVE'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('fmt '))
$bw.Write([int]16)
$bw.Write([Int16]1)
$bw.Write([Int16]$channels)
$bw.Write([int]$sampleRate)
$bw.Write([int]($sampleRate * $channels * $bitsPerSample / 8))
$bw.Write([Int16]($channels * $bitsPerSample / 8))
$bw.Write([Int16]$bitsPerSample)
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('data'))
$bw.Write([int]$dataSize)
foreach ($s in $samples) { $bw.Write($s) }
$bw.Close()
$fs.Close()

$size = [Math]::Round((Get-Item $path).Length / 1024, 1)
$ms = [Math]::Round($samples.Count / $sampleRate * 1000, 0)
Write-Output "Created: $path ($size KB, $($samples.Count) samples, ${ms}ms)"
