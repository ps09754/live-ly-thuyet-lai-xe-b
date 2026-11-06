@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Lan dau chay: dang cai thu vien, doi 1-2 phut...
  call npm install
)
echo Dang bat 600 Cau Ly Thuyet Lai Xe TikTok LIVE... Dong cua so nay la tat app.
echo Link cho TikTok LIVE Studio: http://lvh.me:3000/?view=stage
rem Live mode: the stage page never reloads by itself while streaming
set LIVE_MODE=1
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
npm run dev
pause
