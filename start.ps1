# === Quiz MVP - Lancement ===

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

# Kill les anciennes instances
Write-Host "Fermeture des anciennes instances..." -ForegroundColor Yellow
Get-Process -Name "uvicorn","node" -ErrorAction SilentlyContinue | Stop-Process -Force
$ports = @(8000, 3000)
foreach ($port in $ports) {
    $procs = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
    if ($procs) {
        $procs | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Write-Host "  Port $port libere" -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 1

# Init la BDD si besoin
Write-Host "`n[1/3] Initialisation BDD..." -ForegroundColor Cyan
Push-Location $backendDir
python -c "from database import init_db; init_db()"
Pop-Location

# Backend
Write-Host "[2/3] Demarrage backend FastAPI (port 8000)..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit -Command Set-Location '$backendDir'; python -m uvicorn main:app --reload --port 8000" -PassThru

# Frontend
Write-Host "[3/3] Demarrage frontend React (port 3000)..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit -Command Set-Location '$frontendDir'; npm run dev" -PassThru

Write-Host "`n=== Tout est lance ===" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:3000"
Write-Host "  Backend  : http://localhost:8000"
Write-Host "`nAppuyez sur Entree pour tout fermer..." -ForegroundColor Yellow
Read-Host

# Cleanup
Write-Host "Fermeture..." -ForegroundColor Yellow
@($backend, $frontend) | ForEach-Object {
    if ($_ -and -not $_.HasExited) {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}
# Re-kill les ports au cas où
foreach ($port in $ports) {
    $procs = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
    if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
}
Write-Host "Termine." -ForegroundColor Green
