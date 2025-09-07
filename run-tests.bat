@echo off
echo Starting TrainingLab E2E Tests for HistoryPage
echo ================================================

echo.
echo [1/3] Starting local server...
start /B python server.py
timeout /t 5 /nobreak > nul

echo.
echo [2/3] Waiting for server to be ready...
timeout /t 3 /nobreak > nul

echo.
echo [3/3] Running E2E tests...
npx playwright test tests/e2e/history-page.spec.js --headed --reporter=list

echo.
echo Tests completed! Check results above.
pause