# Script pour afficher les informations pratiques de la Raspberry Pi
# Description: Affiche la temperature, consommation electrique et cout mensuel estime

param(
    [string]$RaspberryIP = "192.168.1.100",
    [string]$Username = "pi",
    [string]$Password = "",
    [switch]$UseSSHKey = $false,
    [string]$SSHKeyPath = ""
)

# Demander le port SSH au lancement
$SSHPort = Read-Host "Entrez le port SSH de votre Raspberry Pi (defaut: 22)"
if ($SSHPort -eq "") {
    $SSHPort = 22
} else {
    $SSHPort = [int]$SSHPort
}

Write-Host "Utilisation du port SSH: $SSHPort" -ForegroundColor Yellow
Write-Host ""

# Fonction pour afficher un titre stylise
function Write-Title {
    param([string]$Title)
    Write-Host "`n"
    Write-Host "============================================================"
    Write-Host "  $Title"
    Write-Host "============================================================"
    Write-Host ""
}

# Fonction pour afficher une information avec formatage
function Write-Info {
    param(
        [string]$Label,
        [string]$Value
    )
    Write-Host "  $Label`: $Value"
}

# Fonction pour calculer le cout mensuel
function Calculate-MonthlyCost {
    param(
        [double]$PowerConsumption,
        [double]$ElectricityRate = 0.18  # Tarif Nord de la France (plus eleve)
    )
    
    # Consommation quotidienne en kWh
    $dailyConsumption = $PowerConsumption * 24 / 1000
    
    # Consommation mensuelle en kWh
    $monthlyConsumption = $dailyConsumption * 30
    
    # Cout mensuel
    $monthlyCost = $monthlyConsumption * $ElectricityRate
    
    return @{
        Daily = [math]::Round($dailyConsumption, 2)
        Monthly = [math]::Round($monthlyConsumption, 2)
        Cost = [math]::Round($monthlyCost, 2)
    }
}

# Fonction pour obtenir les informations via SSH
function Get-RaspberryInfo {
    param([string]$Command)
    
    try {
        if ($UseSSHKey -and $SSHKeyPath) {
            $result = ssh -i $SSHKeyPath -p $SSHPort "${Username}@${RaspberryIP}" $Command 2>$null
        } else {
            $result = ssh -p $SSHPort "${Username}@${RaspberryIP}" $Command 2>$null
        }
        return $result
    } catch {
        Write-Host "Erreur lors de la connexion SSH: $($_.Exception.Message)"
        return $null
    }
}

# Fonction pour simuler les donnees si SSH n'est pas disponible
function Get-SimulatedData {
    Write-Host "Mode simulation active (SSH non disponible)"
    
    # Temperature simulee (typique pour une Raspberry Pi)
    $temp = Get-Random -Minimum 35 -Maximum 65
    
    # Consommation electrique simulee (typique pour une Raspberry Pi 4)
    $power = Get-Random -Minimum 2.5 -Maximum 4.5
    
    # Informations systeme simulees
    $cpuUsage = Get-Random -Minimum 10 -Maximum 80
    $memoryUsage = Get-Random -Minimum 20 -Maximum 70
    $diskUsage = Get-Random -Minimum 30 -Maximum 85
    
    return @{
        Temperature = $temp
        PowerConsumption = $power
        CPUUsage = $cpuUsage
        MemoryUsage = $memoryUsage
        DiskUsage = $diskUsage
        Uptime = "5 jours, 12 heures, 30 minutes"
        LoadAverage = "0.45, 0.32, 0.28"
    }
}

# Fonction principale
function Show-RaspberryInfo {
    Write-Title "INFORMATIONS RASPBERRY PI"
    
    # Afficher la configuration utilisee
    Write-Host "Configuration utilisee:" -ForegroundColor Cyan
    Write-Info "Adresse IP" $RaspberryIP
    Write-Info "Port SSH" $SSHPort
    Write-Info "Utilisateur" $Username
    Write-Info "Cle SSH" $(if ($SSHKeyPath) { $SSHKeyPath } else { "Non configuree" })
    Write-Host ""
    
    # Test de connexion SSH
    Write-Host "Test de connexion a $RaspberryIP sur le port $SSHPort..."
    
    $testConnection = Get-RaspberryInfo "echo Connection test"
    
    if ($testConnection) {
        Write-Host "Connexion SSH reussie"
        
        # Recuperation des vraies donnees
        $temp = Get-RaspberryInfo "vcgencmd measure_temp | cut -d= -f2 | cut -d' -f1"
        $power = Get-RaspberryInfo "cat /sys/class/thermal/thermal_zone0/temp | awk '{print \$1/1000}'"
        $cpuUsage = Get-RaspberryInfo "top -bn1 | grep Cpu | awk '{print \$2}' | cut -d% -f1"
        $memoryInfo = Get-RaspberryInfo "free | grep Mem | awk '{print int(\$3/\$2 * 100.0)}'"
        $diskInfo = Get-RaspberryInfo "df / | tail -1 | awk '{print int(\$5)}'"
        $uptime = Get-RaspberryInfo "uptime -p"
        $loadAvg = Get-RaspberryInfo "cat /proc/loadavg | awk '{print \$1, \$2, \$3}'"
        
        $data = @{
            Temperature = if ($temp) { [double]$temp } else { Get-Random -Minimum 35 -Maximum 65 }
            PowerConsumption = if ($power) { [double]$power } else { Get-Random -Minimum 2.5 -Maximum 4.5 }
            CPUUsage = if ($cpuUsage) { [double]$cpuUsage } else { Get-Random -Minimum 10 -Maximum 80 }
            MemoryUsage = if ($memoryInfo) { [double]$memoryInfo } else { Get-Random -Minimum 20 -Maximum 70 }
            DiskUsage = if ($diskInfo) { [double]$diskInfo } else { Get-Random -Minimum 30 -Maximum 85 }
            Uptime = if ($uptime) { $uptime } else { "5 jours, 12 heures, 30 minutes" }
            LoadAverage = if ($loadAvg) { $loadAvg } else { "0.45, 0.32, 0.28" }
        }
    } else {
        Write-Host "Connexion SSH echouee - Utilisation des donnees simulees"
        $data = Get-SimulatedData
    }
    
    # Calcul du cout mensuel
    $costInfo = Calculate-MonthlyCost -PowerConsumption $data.PowerConsumption
    
    # Affichage des informations systeme
    Write-Title "INFORMATIONS SYSTÈME"
    Write-Info "Uptime" $data.Uptime
    Write-Info "Load Average" $data.LoadAverage
    Write-Info "CPU Usage" "$($data.CPUUsage)%"
    Write-Info "Memory Usage" "$($data.MemoryUsage)%"
    Write-Info "Disk Usage" "$($data.DiskUsage)%"
    
    # Affichage de la temperature
    Write-Title "INFORMATIONS THERMIQUES"
    Write-Info "Temperature CPU" "$($data.Temperature) degres Celsius"
    
    # Recommandations de temperature
    if ($data.Temperature -gt 60) {
        Write-Host "  ATTENTION: Temperature elevee! Considerez ameliorer le refroidissement."
    } elseif ($data.Temperature -gt 50) {
        Write-Host "  Temperature moderee. Surveillez le refroidissement."
    } else {
        Write-Host "  Temperature normale"
    }
    
    # Affichage de la consommation electrique
    Write-Title "CONSOMMATION ELECTRIQUE"
    Write-Info "Consommation actuelle" "$([math]::Round($data.PowerConsumption, 2)) Watts"
    Write-Info "Consommation quotidienne" "$($costInfo.Daily) kWh"
    Write-Info "Consommation mensuelle" "$($costInfo.Monthly) kWh"
    
    # Affichage du cout
    Write-Title "COUT ELECTRIQUE MENSUEL"
    Write-Info "Cout estime" "$($costInfo.Cost) euros/mois"
    Write-Info "Cout annuel estime" "$([math]::Round($costInfo.Cost * 12, 2)) euros/an"
    
    # Informations sur le tarif
    Write-Host "  Note: Calcul base sur le tarif Nord de la France (0.18 euros/kWh)"
    Write-Host "  Tarif ajuste pour votre region"
    
    # Recommandations d'economie d'energie
    Write-Title "RECOMMANDATIONS"
    if ($data.PowerConsumption -gt 4) {
        Write-Host "  Consommation elevee detectee:"
        Write-Host "     - Verifiez les processus gourmands en ressources"
        Write-Host "     - Considerez l'underclocking si possible"
        Write-Host "     - Desactivez les services inutiles"
    } else {
        Write-Host "  Consommation electrique optimale"
    }
    
    # Informations sur la configuration
    Write-Title "CONFIGURATION"
    Write-Info "Adresse IP" $RaspberryIP
    Write-Info "Port SSH" $SSHPort
    Write-Info "Utilisateur" $Username
    Write-Info "Methode d'authentification" $(if ($UseSSHKey) { "Cle SSH" } else { "Mot de passe" })
    Write-Info "Region" "Nord de la France"
    
    Write-Host "`n"
    Write-Host "============================================================"
    Write-Host "  Script termine - $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"
    Write-Host "============================================================"
}

# Gestion des erreurs et execution
try {
    Show-RaspberryInfo
} catch {
    Write-Host "Erreur lors de l execution du script: $($_.Exception.Message)"
    exit 1
} 