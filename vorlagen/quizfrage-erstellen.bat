@echo off
setlocal

echo.
set /p DATEINAME=Dateiname eingeben (zum Beispiel delir-10): 
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

echo.
set /p QUESTION=Frage eingeben: 
if "%QUESTION%"=="" (
    echo Keine Frage eingegeben.
    pause
    exit /b
)

echo.
set /p ANSWER=Antwort eingeben: 
if "%ANSWER%"=="" (
    echo Keine Antwort eingegeben.
    pause
    exit /b
)

echo.
set /p TOPIC=Thema eingeben (zum Beispiel krankheitslehre): 
if "%TOPIC%"=="" set TOPIC=krankheitslehre

echo.
set /p DIFFICULTY=Schwierigkeit eingeben (leicht, mittel, schwer): 
if "%DIFFICULTY%"=="" set DIFFICULTY=leicht

(
echo ---
echo question: %QUESTION%
echo answer: %ANSWER%
echo topic: %TOPIC%
echo difficulty: %DIFFICULTY%
echo ---
) > "src\content\quiz\%DATEINAME%.md"

echo.
echo Datei erfolgreich erstellt:
echo src\content\quiz\%DATEINAME%.md
echo.

pause
endlocal