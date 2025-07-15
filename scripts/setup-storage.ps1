# Script de configuration des dossiers de stockage
# Usage: .\setup-storage.ps1

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)

Write-Host "Configuration des dossiers de stockage..." -ForegroundColor Green

# Demander les chemins
$logsPath = Read-Host "Chemin pour les logs (defaut: /home/$User/logawa-logs)"
if ($logsPath -eq "") {
    $logsPath = "/home/$User/logawa-logs"
}

# Demander si on veut configurer les sauvegardes
$enableBackups = Read-Host "Configurer les sauvegardes ? (oui/non)"
$backupsPath = ""
if ($enableBackups -eq "oui") {
    $backupsPath = Read-Host "Chemin pour les sauvegardes (defaut: /home/$User/logawa-backups)"
    if ($backupsPath -eq "") {
        $backupsPath = "/home/$User/logawa-backups"
    }
}

Write-Host "Logs: $logsPath" -ForegroundColor Yellow
if ($backupsPath -ne "") {
    Write-Host "Sauvegardes: $backupsPath" -ForegroundColor Yellow
} else {
    Write-Host "Sauvegardes: desactivees" -ForegroundColor Yellow
}

# Creer les dossiers sur la Raspberry Pi
Write-Host "Creation des dossiers..." -ForegroundColor Yellow
if ($backupsPath -ne "") {
    ssh -i $SSHKey ${User}@${RaspberryIP} "mkdir -p '$logsPath' '$backupsPath' && chmod 755 '$logsPath' '$backupsPath' && ls -la '$logsPath' '$backupsPath'"
} else {
    ssh -i $SSHKey ${User}@${RaspberryIP} "mkdir -p '$logsPath' && chmod 755 '$logsPath' && ls -la '$logsPath'"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la creation des dossiers" -ForegroundColor Red
    exit 1
}

# Mettre a jour le fichier .env local
Write-Host "Mise a jour du fichier .env local..." -ForegroundColor Yellow
if (Test-Path ".env") {
    # Sauvegarder l'ancien fichier
    Copy-Item ".env" ".env.backup"
    
    # Lire le contenu actuel
    $envContent = Get-Content ".env"
    
    # Mettre a jour ou ajouter les chemins
    $newContent = @()
    $logsPathUpdated = $false
    $backupsPathUpdated = $false
    
    foreach ($line in $envContent) {
        if ($line -match "^LOGS_PATH=") {
            $newContent += "LOGS_PATH=$logsPath"
            $logsPathUpdated = $true
        } elseif ($line -match "^BACKUPS_PATH=") {
            if ($backupsPath -ne "") {
                $newContent += "BACKUPS_PATH=$backupsPath"
            }
            $backupsPathUpdated = $true
        } else {
            $newContent += $line
        }
    }
    
    # Ajouter les chemins s'ils n'existaient pas
    if (-not $logsPathUpdated) {
        $newContent += "LOGS_PATH=$logsPath"
    }
    if (-not $backupsPathUpdated -and $backupsPath -ne "") {
        $newContent += "BACKUPS_PATH=$backupsPath"
    }
    
    # Ecrire le nouveau contenu
    $newContent | Set-Content ".env"
    
    Write-Host "Fichier .env mis a jour avec succes" -ForegroundColor Green
} else {
    Write-Host "Le fichier .env n'existe pas. Veuillez le creer manuellement avec:" -ForegroundColor Yellow
    Write-Host "LOGS_PATH=$logsPath" -ForegroundColor Cyan
    if ($backupsPath -ne "") {
        Write-Host "BACKUPS_PATH=$backupsPath" -ForegroundColor Cyan
    }
}

Write-Host "Configuration terminee!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant utiliser: .\deploy-to-raspberry.ps1" -ForegroundColor Cyan 