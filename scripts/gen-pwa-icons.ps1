# GENERA LOS ICONOS PNG DEL PWA (manifest.webmanifest)
# node no necesita esto; se ejecuta con PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts/gen-pwa-icons.ps1
# Salida: public/assets/icons/icon-192x192.png, icon-512x512.png, icon-maskable-512x512.png

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Split-Path $PSScriptRoot -Parent) "public\assets\icons"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$bg = [System.Drawing.ColorTranslator]::FromHtml("#0f172a")
$accent = [System.Drawing.ColorTranslator]::FromHtml("#3b82f6")
$fg = [System.Drawing.Color]::White

function New-RoundedRect {
  param([int]$x, [int]$y, [int]$w, [int]$h, [int]$radius)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Icon {
  param([int]$size, [bool]$maskable)

  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  # Fondo a sangre completa (requerido para maskable)
  $g.Clear($bg)

  $innerScale = if ($maskable) { 0.56 } else { 0.72 }
  $inner = [int]($size * $innerScale)
  $innerX = [int](($size - $inner) / 2)
  $radius = [int]($inner * 0.22)

  $accentBrush = New-Object System.Drawing.SolidBrush($accent)
  $path = New-RoundedRect -x $innerX -y $innerX -w $inner -h $inner -radius $radius
  $g.FillPath($accentBrush, $path)

  # Texto "DCS"
  $fontSize = [float]($inner * 0.30)
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fgBrush = New-Object System.Drawing.SolidBrush($fg)
  $text = "DCS"
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF($innerX, $innerX, $inner, $inner)
  $g.DrawString($text, $font, $fgBrush, $rect, $sf)

  $font.Dispose()
  $fgBrush.Dispose()
  $accentBrush.Dispose()
  $sf.Dispose()
  $path.Dispose()
  $g.Dispose()

  $file = if ($maskable) { "icon-maskable-$size`x$size.png" } else { "icon-$size`x$size.png" }
  $bmp.Save((Join-Path $outDir $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "Generado: public\assets\icons\$file"
}

New-Icon -size 192 -maskable $false
New-Icon -size 512 -maskable $false
New-Icon -size 512 -maskable $true

Write-Output "Iconos PWA generados en public\assets\icons"
