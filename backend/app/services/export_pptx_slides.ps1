param(
    [string]$PptxPath,
    [string]$OutputDir
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$resolvedPptx = (Resolve-Path $PptxPath).Path
$resolvedOut = (Resolve-Path $OutputDir).Path

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    # 2 = msoTrue (ReadOnly), 0 = msoFalse (Untitled), 0 = msoFalse (WithWindow)
    $pres = $ppt.Presentations.Open($resolvedPptx, 2, 0, 0)
    # 17 = ppSaveAsPNG
    $pres.SaveAs($resolvedOut, 17)
    $pres.Close()
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    Write-Output "SUCCESS"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
