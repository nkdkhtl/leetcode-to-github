Param(
    [string]$Output = "leetcode-to-github.zip"
)

$ErrorActionPreference = "Stop"

Write-Host "Building Leetcode to Github Extension..."

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (Test-Path $Output) {
    Remove-Item $Output -Force
}

$required = @(
    "manifest.json",
    "icon",
    "popup",
    "scripts",
    "README.md"
)

$missing = $required | Where-Object { -not (Test-Path $_) }
if ($missing.Count -gt 0) {
    Write-Error ("Missing required paths: " + ($missing -join ", "))
    exit 1
}

$paths = @($required)
if (Test-Path "PRIVACY.md") {
    $paths += "PRIVACY.md"
} else {
    Write-Host "PRIVACY.md not found, skipping it."
}

Compress-Archive -Path $paths -DestinationPath $Output -Force

if (-not (Test-Path $Output)) {
    Write-Error "Build failed: zip file was not created."
    exit 1
}

Write-Host ("Build complete: " + $Output)
