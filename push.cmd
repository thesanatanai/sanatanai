@echo off
cls
color 01
title Sanatan AI

echo ## Sanatan AI - The Soul of Intelligence ##
echo.
echo Running tests
cmd /c "npm run test"

if "%errorLevel%"=="0" (
    echo All Tests Passed
    echo.
    echo Commiting and pushing to GitHub
    echo.
    echo Write 'x' in commit message to skip commit.
    set /p commitMsg=Please enter a commit message (leave blank to auto-update and commit) 
    if "%commitMsg%"=="" (
        git add .
        git commit -m "Update Sanatan AI"
        git push
    ) else if "%commitMsg%" == "x" (
        echo Skipping commit.
    ) else (
        git add .
        git commit -m "%commitMsg%"
        git push
    )
) else (
    echo Error Occured
    pause
    exit 0
)