<#
.SYNOPSIS
    Drop and recreate the local Postgres database used by docker compose.

.DESCRIPTION
    DESTRUCTIVE — wipes every row in every table by dropping and recreating
    the database inside the docker Postgres container.

    After running this, re-run seed_demo_data.ps1 to repopulate.

.EXAMPLE
    .\scripts\reset_db.ps1
    .\scripts\reset_db.ps1 -Yes

.NOTES
    Requires Docker Desktop running.
#>

[CmdletBinding()]
param(
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
Set-Location $repoRoot

function Get-ComposeCommand {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $null = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) { return @('docker', 'compose') }
    }
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        return @('docker-compose')
    }
    throw "Neither 'docker compose' nor 'docker-compose' is available on PATH."
}

function Invoke-Compose {
    param([string[]]$Args)
    $cmd = $script:Compose + $Args
    & $cmd[0] $cmd[1..($cmd.Length - 1)]
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $($cmd -join ' ')"
    }
}

$script:Compose = Get-ComposeCommand

$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { 'studioos' }
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'studioos' }

if (-not $Yes) {
    Write-Host "This will DROP the database '$dbName' in the docker postgres container." -ForegroundColor Yellow
    $answer = Read-Host "Continue? [y/N]"
    if ($answer -notmatch '^(y|yes)$') {
        Write-Host "Aborted."
        exit 1
    }
}

Write-Host "-> Stopping app containers that hold open connections"
Invoke-Compose @('stop', 'api', 'worker', 'beat', 'flower') | Out-Null

Write-Host "-> Ensuring db is up"
Invoke-Compose @('up', '-d', 'db') | Out-Null

Write-Host "-> Waiting for Postgres"
for ($i = 1; $i -le 30; $i++) {
    & $script:Compose[0] $script:Compose[1..($script:Compose.Length - 1)] `
        exec -T db pg_isready -U $dbUser *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
}

Write-Host "-> Dropping and recreating database '$dbName'"
$sql = @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$dbName' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$dbName";
CREATE DATABASE "$dbName" OWNER "$dbUser";
"@

$sql | & $script:Compose[0] $script:Compose[1..($script:Compose.Length - 1)] `
    exec -T db psql -U $dbUser -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
    throw "psql failed while recreating the database."
}

Write-Host "-> Restarting app containers"
Invoke-Compose @('up', '-d', 'api', 'worker', 'beat') | Out-Null

Write-Host ""
Write-Host "Database '$dbName' is empty." -ForegroundColor Green
Write-Host "  Next step: .\scripts\seed_demo_data.ps1"
