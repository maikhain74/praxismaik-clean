@echo off
set /p DATEINAME=Bitte Dateinamen eingeben (zum Beispiel delir-06): 

if "%DATEINAME%"=="" (
    echo Kein Dateiname eingegeben.
    pause
    exit /b
)

if exist "src\content\quiz\%DATEINAME%.md" (
    echo Datei existiert bereits: src\content\quiz\%DATEINAME%.md
    pause
    exit /b
)

copy "vorlagen\quiz-template.md" "src\content\quiz\%DATEINAME%.md" >nul

echo Datei erstellt:
echo src\content\quiz\%DATEINAME%.md

notepad "src\content\quiz\%DATEINAME%.md"