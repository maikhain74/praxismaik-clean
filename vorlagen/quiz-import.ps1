$importFile = "vorlagen\quiz-import.txt"
$targetFolder = "src\content\quiz"

if (-not (Test-Path $importFile)) {
    Write-Host "Import-Datei nicht gefunden: $importFile"
    Read-Host "Enter drücken zum Beenden"
    exit
}

$lines = Get-Content $importFile -Encoding UTF8
$created = 0
$skipped = 0

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
        continue
    }

    $parts = $line.Split(";")

    if ($parts.Count -ne 5) {
        Write-Host "Übersprungen, falsches Format:" $line
        $skipped++
        continue
    }

    $fileName = $parts[0].Trim()
    $question = $parts[1].Trim()
    $answer = $parts[2].Trim()
    $topic = $parts[3].Trim()
    $difficulty = $parts[4].Trim()

    if ($difficulty -notin @("leicht", "mittel", "schwer")) {
        Write-Host "Übersprungen, ungültige Schwierigkeit:" $fileName
        $skipped++
        continue
    }

    if ([string]::IsNullOrWhiteSpace($fileName) -or
        [string]::IsNullOrWhiteSpace($question) -or
        [string]::IsNullOrWhiteSpace($answer) -or
        [string]::IsNullOrWhiteSpace($topic)) {
        Write-Host "Übersprungen, leere Pflichtfelder:" $line
        $skipped++
        continue
    }

    $filePath = Join-Path $targetFolder "$fileName.md"

    if (Test-Path $filePath) {
        Write-Host "Existiert schon, übersprungen:" $filePath
        $skipped++
        continue
    }

    $content = @"
---
question: $question
answer: $answer
topic: $topic
difficulty: $difficulty
---
"@

    Set-Content -Path $filePath -Value $content -Encoding UTF8
    Write-Host "Erstellt:" $filePath
    $created++
}

Write-Host ""
Write-Host "Fertig."
Write-Host "Erstellt: $created"
Write-Host "Übersprungen: $skipped"
Read-Host "Enter drücken zum Beenden"