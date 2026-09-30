$ErrorActionPreference = "Stop"

$rootPath = Resolve-Path "."
$sourceDir = Join-Path $rootPath "out"
$stagingDir = Join-Path $rootPath "dist-ferozo"
$zipPath = Join-Path $rootPath "produccion-buenas-nuevas-ferozo.zip"

Write-Host "Iniciando preparación del paquete para Servidor Ferozo (Apache)..."

# 1. Ejecutar compilación fresca de Next.js
Write-Host "Compilando el proyecto con Next.js (export estático)..."
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    throw "Falló la compilación de Next.js."
}

# 2. Limpiar directorio temporal staging
if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

# 3. Copiar archivos de 'out' excluyendo temporales de Next.js
Get-ChildItem -Path $sourceDir -Force | Where-Object { 
    $_.Name -notlike "__next*" -and 
    $_.Name -ne "tsconfig.tsbuildinfo" -and 
    $_.Name -ne "dev"
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $stagingDir -Recurse -Force
}

# 4. Asegurar dotfiles y archivos esenciales desde public/ (.htaccess, .user.ini, api.php, uploads, etc.)
$publicDir = Join-Path $rootPath "public"
if (Test-Path $publicDir) {
    Get-ChildItem -Path $publicDir -Force | ForEach-Object {
        $destFile = Join-Path $stagingDir $_.Name
        if (-not (Test-Path $destFile)) {
            Copy-Item -Path $_.FullName -Destination $destFile -Recurse -Force
        }
    }
}

# 5. Limpiar cualquier archivo __next* o *.txt residual de compilación en todo el árbol
Get-ChildItem -Path $stagingDir -Recurse -Filter "__next*" -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path $stagingDir -Recurse -Filter "*.txt" -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# 6. Asegurar carpeta uploads dentro del staging para Ferozo
$stagingUploads = Join-Path $stagingDir "uploads"
if (-not (Test-Path $stagingUploads)) {
    New-Item -ItemType Directory -Path $stagingUploads | Out-Null
}

# 6. Eliminar zip anterior si existe
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

# 7. Comprimir paquete .zip
Write-Host "Comprimiendo archivo zip de producción..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# 8. Limpiar carpeta temporal
Remove-Item -Recurse -Force $stagingDir

$zipItem = Get-Item $zipPath
$sizeMb = [math]::Round($zipItem.Length / 1MB, 2)
Write-Host ""
Write-Host "=========================================================="
Write-Host " ¡PAQUETE FEROZO CREADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host " Archivo: $zipPath"
Write-Host " Tamaño:  $sizeMb MB ($($zipItem.Length) bytes)"
Write-Host " Listo para descomprimir en la carpeta public_html de Ferozo"
Write-Host "=========================================================="
