# start_demo.ps1
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "INTELLIHUNT - Cyber Threat Hunting Copilot (Windows)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# --- 1. Port Conflict Resolution ---
function Check-Port {
    param([int]$Port)
    $Connections = netstat -ano | Select-String ":$Port\s"
    if ($Connections) {
        return $true
    }
    return $false
}

function Kill-ProcessOnPort {
    param([int]$Port)
    Write-Host "[!] Port $Port is in use. Attempting to terminate the occupying process..." -ForegroundColor Yellow
    $Connections = netstat -ano | Select-String ":$Port\s"
    foreach ($Connection in $Connections) {
        $Parts = $Connection.Line -split '\s+'
        $PidValue = $Parts[-1]
        if ($PidValue -and $PidValue -ne "0") {
            try {
                Stop-Process -Id $PidValue -Force -ErrorAction SilentlyContinue
                Write-Host "   [OK] Terminated process $PidValue on port $Port." -ForegroundColor Green
            } catch {
                Write-Host "   [FAIL] Failed to terminate process $PidValue. You may need Administrator privileges." -ForegroundColor Red
            }
        }
    }
}

if (Check-Port -Port 8000) { Kill-ProcessOnPort -Port 8000 }
if (Check-Port -Port 8080) { Kill-ProcessOnPort -Port 8080 }


# --- 2. Clean Up macOS/Linux .venv ---
$VenvPath = Join-Path $ScriptDir ".venv"
if (Test-Path $VenvPath) {
    if (Test-Path (Join-Path $VenvPath "bin")) {
        Write-Host "[*] Found incompatible macOS/Linux .venv. Removing it..." -ForegroundColor Yellow
        Remove-Item -Path $VenvPath -Recurse -Force
    }
}

# --- 3. Create & Setup Windows .venv ---
if (-not (Test-Path $VenvPath)) {
    Write-Host "[*] Creating new Windows virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

$PythonExe = Join-Path $VenvPath "Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "[Error] Python executable not found at $PythonExe" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Upgrading pip and installing backend dependencies..." -ForegroundColor Cyan
& $PythonExe -m pip install --upgrade pip -q
& $PythonExe -m pip install -r backend/requirements.txt -q
# Ensure nfstream is installed for live capture
& $PythonExe -m pip install nfstream -q


# --- 4. Install Frontend Dependencies ---
$FrontendDir = Join-Path $ScriptDir "frontend"
$NodeModulesPath = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $NodeModulesPath)) {
    Write-Host "[*] Installing frontend dependencies (this may take a minute)..." -ForegroundColor Cyan
    Push-Location $FrontendDir
    npm install --silent
    Pop-Location
}


# --- 5. Start Services ---
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

$env:DOTENV_PATH = Join-Path $ScriptDir ".env"

Write-Host "[*] Starting Backend API in the background (http://localhost:8000)..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath $PythonExe -ArgumentList "app/main.py" -WorkingDirectory "backend" -NoNewWindow -PassThru -RedirectStandardOutput "logs\backend.log" -RedirectStandardError "logs\backend_error.log"

Start-Sleep -Seconds 3

Write-Host "[*] Starting Frontend Dashboard in the background (http://localhost:8080)..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "frontend" -NoNewWindow -PassThru -RedirectStandardOutput "logs\frontend.log" -RedirectStandardError "logs\frontend_error.log"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] ALL SERVICES RUNNING IN BACKGROUND" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   [*] Backend API:   http://localhost:8000"
Write-Host "   [*] Dashboard:     http://localhost:8080"
Write-Host ""
Write-Host "[!] PRESS CTRL+C TO STOP ALL SERVICES AND EXIT" -ForegroundColor Red
Write-Host ""
Write-Host "Happy Hunting!" -ForegroundColor Green

# --- 6. Handle Shutdown Gracefully ---
try {
    # Keep the script running until interrupted
    while ($true) {
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "[!] Shutting down all services..." -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
    
    if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
        & taskkill /T /F /PID $FrontendProcess.Id 2>$null
        Write-Host "   [OK] Frontend stopped (PID: $($FrontendProcess.Id))" -ForegroundColor Green
    }
    
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        & taskkill /T /F /PID $BackendProcess.Id 2>$null
        Write-Host "   [OK] Backend stopped (PID: $($BackendProcess.Id))" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[OK] All services safely stopped. Goodbye!" -ForegroundColor Green
}
