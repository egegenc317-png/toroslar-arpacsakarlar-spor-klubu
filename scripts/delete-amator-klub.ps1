$projectDir = Join-Path $PSScriptRoot "..\amator-klub-site"
if (Test-Path $projectDir) {
    Remove-Item -LiteralPath $projectDir -Recurse -Force
    Write-Host "amator-klub-site silindi."
} else {
    Write-Host "amator-klub-site bulunamadı."
}
