<#
.SYNOPSIS
    Populate the local Postgres (running via docker compose) with demo data
    covering every page on the web client.

.DESCRIPTION
    Idempotent — safe to run repeatedly. All seeded users share the same email
    host and password (defaults: @studioos.dev / 123456).

    PowerShell equivalent of scripts/seed_demo_data.sh for Windows users who
    do not have Git Bash or WSL.

.EXAMPLE
    .\scripts\seed_demo_data.ps1
    .\scripts\seed_demo_data.ps1 -Host example.test -Password mypwd

.NOTES
    Requires Docker Desktop running.
#>

[CmdletBinding()]
param(
    [string]$EmailHost,
    [string]$Password
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
Set-Location $repoRoot

function Get-ComposeCommand {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        # Prefer docker compose v2.
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

Write-Host "-> Ensuring db + api services are up"
Invoke-Compose @('up', '-d', 'db', 'api') | Out-Null

Write-Host "-> Waiting for Postgres to become ready"
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    & $script:Compose[0] $script:Compose[1..($script:Compose.Length - 1)] `
        exec -T db pg_isready -U studioos *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    throw "Postgres did not become ready in time."
}

Write-Host "-> Applying migrations"
Invoke-Compose @('exec', '-T', 'api', 'uv', 'run', 'python', 'manage.py', 'migrate', '--noinput')

Write-Host "-> Seeding demo data"
$seedArgs = @('exec', '-T', 'api', 'uv', 'run', 'python', 'manage.py', 'seed_demo_data')
if ($EmailHost) { $seedArgs += @('--host', $EmailHost) }
if ($Password)  { $seedArgs += @('--password', $Password) }
Invoke-Compose $seedArgs

Write-Host ""
Write-Host "Done. Sign in at the web client with any of the seeded accounts." -ForegroundColor Green
Write-Host "  Example: direction@studioos.dev  /  123456"
