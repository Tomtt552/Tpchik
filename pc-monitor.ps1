$ErrorActionPreference = 'SilentlyContinue'
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
$ramTotal = [double]$cs.TotalPhysicalMemory
$ramFree = [double]$os.FreePhysicalMemory * 1024
$ramUsed = [Math]::Max(0, $ramTotal - $ramFree)
$cpuTemp = $null
$thermal = Get-CimInstance -Namespace 'root/wmi' -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -First 1
if ($thermal -and $thermal.CurrentTemperature) { $cpuTemp = [Math]::Round(($thermal.CurrentTemperature / 10) - 273.15, 1) }
$gpuInfo = $null
# Resolve NVIDIA utility from PATH and common driver installation folders.
$nvsmiPath = (Get-Command 'nvidia-smi.exe' -ErrorAction SilentlyContinue).Source
if (-not $nvsmiPath) {
  $candidates = @()
  if ($env:ProgramW6432) { $candidates += (Join-Path $env:ProgramW6432 'NVIDIA Corporation\NVSMI\nvidia-smi.exe') }
  if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'NVIDIA Corporation\NVSMI\nvidia-smi.exe') }
  if ($env:SystemRoot) { $candidates += (Join-Path $env:SystemRoot 'System32\nvidia-smi.exe') }
  $nvsmiPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if ($nvsmiPath) {
  $line = & $nvsmiPath '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu' '--format=csv,noheader,nounits' 2>$null | Select-Object -First 1
  if ($line) {
    $p = $line -split ',\s*'
    if ($p.Count -ge 5) { $gpuInfo = @{ name=$p[0]; load=[double]$p[1]; memoryUsed=[double]$p[2]; memoryTotal=[double]$p[3]; temperature=[double]$p[4] } }
  }
}
$result = @{
  supported = $true
  cpu = @{ name=[string]$cpu.Name; load=[double]$cpu.LoadPercentage; cores=[int]$cpu.NumberOfCores; logical=[int]$cpu.NumberOfLogicalProcessors; temperature=$cpuTemp }
  ram = @{ total=[Math]::Round($ramTotal/1GB,2); used=[Math]::Round($ramUsed/1GB,2); free=[Math]::Round($ramFree/1GB,2); percent=if($ramTotal -gt 0){[Math]::Round(($ramUsed/$ramTotal)*100,1)}else{0} }
  gpu = if($gpuInfo){$gpuInfo}else{@{name=[string]$gpu.Name;load=$null;memoryUsed=$null;memoryTotal=$null;temperature=$null}}
  system = @{ computer=[string]$cs.Name; uptimeHours=[Math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours,1); windows=[string]$os.Caption }
  sampledAt=(Get-Date).ToString('o')
}
$result | ConvertTo-Json -Depth 5 -Compress
