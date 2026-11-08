' PassVault Silent Background Server
' Se ejecuta sin ventana de consola ni icono en la barra de tareas (100% invisible)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\JELop\Documents\AntigravityProjects\pass-vault\apps\server"
WshShell.Run """C:\Users\JELop\AppData\Local\Programs\nodejs\node.exe"" dist/server.js", 0, False
Set WshShell = Nothing

