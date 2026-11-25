$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $dir 'render'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory $out | Out-Null
$f = Get-ChildItem (Split-Path -Parent $dir) -Filter '*.pptx' | Select-Object -First 1
$p = New-Object -ComObject PowerPoint.Application
$pr = $p.Presentations.Open($f.FullName, 1, 0, 0)
$pr.Export($out, 'PNG', 1280, 720)
$pr.Close(); $p.Quit()
