nvm use 18
Start-Sleep(5)
Start-Process Powershell.exe -Argumentlist "-file .\startfunctionwatch.ps1"
Start-Process Powershell.exe -Argumentlist "-file .\startuicodewatch.ps1"
Start-Process Powershell.exe -Argumentlist "-file .\startfirebase.ps1"
code .
Start-Sleep(20)
Start-Process "http://localhost:5000/"