nvm use 18.19.0
Start-Process Powershell.exe -Argumentlist "-file .\startfunctionwatch.ps1"
Start-Process Powershell.exe -Argumentlist "-file .\startuicodewatch.ps1"
Start-Process Powershell.exe -Argumentlist "-file .\startfirebase.ps1"
code .
Start-Sleep(10)
Start-Process "http://localhost:5000/"