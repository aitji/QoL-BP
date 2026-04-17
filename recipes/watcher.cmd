@echo off
echo Watching from 'watcher.cmd'
call ..\.venv\Scripts\activate

cd /d "%~dp0"
python watcher.py

pause