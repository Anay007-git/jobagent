@echo off
echo Pushing code to GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo Push failed. You might need to sign in.
    echo Please run this script again or check your internet connection.
)
pause
