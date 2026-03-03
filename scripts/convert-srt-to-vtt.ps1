# PowerShell SRT to VTT Converter with Language Code Standardization
# Converts SRT subtitle files to WebVTT format and ensures proper naming

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,
    
    [switch]$Recursive,
    
    [string]$LanguageCode = "en_US"  # Default to en_US for consistency
)

function Convert-SrtToVtt {
    param(
        [string]$InputPath,
        [string]$OutputPath
    )
    
    try {
        # Read SRT content
        $content = Get-Content -Path $InputPath -Raw -Encoding UTF8
        
        # Add WEBVTT header
        $vtt = "WEBVTT`n`n"
        
        # Replace comma with period in timestamps (SRT uses comma, VTT uses period)
        $converted = $content -replace '(\d{2}:\d{2}:\d{2}),(\d{3})', '$1.$2'
        
        # Combine
        $vtt += $converted
        
        # Write VTT file
        Set-Content -Path $OutputPath -Value $vtt -Encoding UTF8
        
        Write-Host "[OK] Converted: $(Split-Path $InputPath -Leaf) -> $(Split-Path $OutputPath -Leaf)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERROR] Error converting $InputPath : $_" -ForegroundColor Red
        return $false
    }
}

function Get-StandardizedVttName {
    param(
        [string]$SrtPath,
        [string]$LangCode
    )
    
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($SrtPath)
    
    # Remove existing language codes (en, en_US, es, etc.)
    $baseName = $baseName -replace '_[a-z]{2}(_[A-Z]{2})?$', ''
    $baseName = $baseName -replace '\.[a-z]{2}(_[A-Z]{2})?$', ''
    
    $directory = Split-Path $SrtPath -Parent
    return Join-Path $directory "$baseName.$LangCode.vtt"
}

# Main execution
if (Test-Path $Path -PathType Container) {
    # Directory mode
    Write-Host "Converting all SRT files in: $Path" -ForegroundColor Cyan
    Write-Host "Using language code: $LanguageCode" -ForegroundColor Cyan
    Write-Host ""
    
    $searchOption = if ($Recursive) { Get-ChildItem -Path $Path -Filter "*.srt" -Recurse } else { Get-ChildItem -Path $Path -Filter "*.srt" }
    
    $converted = 0
    $skipped = 0
    $failed = 0
    
    foreach ($file in $searchOption) {
        # Generate standardized output path
        $outputPath = Get-StandardizedVttName -SrtPath $file.FullName -LangCode $LanguageCode
        
        # Skip if VTT already exists
        if (Test-Path $outputPath) {
            Write-Host "[SKIP] $($file.Name) (VTT already exists: $(Split-Path $outputPath -Leaf))" -ForegroundColor Yellow
            $skipped++
            continue
        }
        
        if (Convert-SrtToVtt -InputPath $file.FullName -OutputPath $outputPath) {
            $converted++
        } else {
            $failed++
        }
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "   Converted: $converted" -ForegroundColor Green
    Write-Host "   Skipped: $skipped" -ForegroundColor Yellow
    Write-Host "   Failed: $failed" -ForegroundColor Red
    
} elseif (Test-Path $Path -PathType Leaf) {
    # Single file mode
    if (-not $Path.EndsWith('.srt')) {
        Write-Host "[ERROR] Input file must be .srt" -ForegroundColor Red
        exit 1
    }
    
    $outputPath = Get-StandardizedVttName -SrtPath $Path -LangCode $LanguageCode
    Write-Host "Output will be: $outputPath" -ForegroundColor Cyan
    Convert-SrtToVtt -InputPath $Path -OutputPath $outputPath
    
} else {
    Write-Host "[ERROR] Path not found: $Path" -ForegroundColor Red
    exit 1
}
