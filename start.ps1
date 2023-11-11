Start-Process Powershell.exe -Argumentlist "-file .\startfunctionwatch.ps1"
Start-Process Powershell.exe -Argumentlist "-file .\startuicodewatch.ps1"
Start-Process Powershell.exe -Argumentlist "-file .\startfirebase.ps1"
code .
sleep(5)
Start-Process "http://localhost:5000/"