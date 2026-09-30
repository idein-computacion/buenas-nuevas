$processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"
$killed = 0
$kept = 0
foreach ($p in $processes) {
    if ($p.CommandLine -like "*buenas-nuevas*") {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $killed++
    } else {
        $kept++
    }
}
Write-Output "Killed: $killed, Kept: $kept"
$mem = Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory
Write-Output "Free RAM (MB): $([math]::Round($mem.FreePhysicalMemory / 1024, 2))"
