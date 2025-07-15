# Script d'installation initiale de la Raspberry Pi
# Usage: .\setup-raspberry.ps1

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx",
    [string]$GitRepo = "https://github.com/votre-username/Logawa.git"
)

Write-Host "Installation initiale de la Raspberry Pi..." -ForegroundColor Green

# Demander l'URL du repo GitHub
$repoUrl = Read-Host "Entrez l'URL du depot GitHub (ou appuyez sur Entree pour utiliser: $GitRepo)"
if ($repoUrl -eq "") {
    $repoUrl = $GitRepo
}

Write-Host "Utilisation du depot: $repoUrl" -ForegroundColor Yellow

# 1. Verifier et installer Git sur la Raspberry Pi
Write-Host "Verification de Git..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "if command -v git > /dev/null 2>&1; then echo 'Git est deja installe:'; git --version; else echo 'Installation de Git...'; sudo apt update -qq && sudo apt install -y git && git --version; fi"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la verification/installation de Git" -ForegroundColor Red
    Write-Host "Assurez-vous que votre utilisateur a les droits sudo sans mot de passe" -ForegroundColor Yellow
    exit 1
}

# 2. Installer Docker si pas deja installe
Write-Host "Verification de Docker..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "if command -v docker > /dev/null 2>&1; then echo 'Docker est deja installe'; else echo 'Installation de Docker...'; curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $USER && rm get-docker.sh; fi"

# 3. Installer Docker Compose si pas deja installe
Write-Host "Verification de Docker Compose..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "if command -v docker-compose > /dev/null 2>&1; then echo 'Docker Compose est deja installe'; else echo 'Installation de Docker Compose...'; sudo apt install -y docker-compose; fi"

# 4. Cloner le depot GitHub
Write-Host "Clonage du depot GitHub..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~ && if [ -d 'Logawa' ]; then echo 'Le dossier Logawa existe deja. Suppression...'; rm -rf Logawa; fi && git clone '$repoUrl' Logawa && cd Logawa && git status"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du clonage du depot" -ForegroundColor Red
    exit 1
}

# 5. Verifier la structure du projet
Write-Host "Verification de la structure du projet..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa && ls -la && echo '' && echo 'Fichiers Docker:' && ls -la *.yml *.yaml 2>/dev/null || echo 'Aucun fichier Docker Compose trouve'"

Write-Host "Installation terminee avec succes !" -ForegroundColor Green
Write-Host "Vous pouvez maintenant utiliser: .\deploy-to-raspberry.ps1" -ForegroundColor Cyan 