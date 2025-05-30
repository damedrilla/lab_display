Set WshShell = CreateObject("WScript.Shell")
' The 0 means "hide the window", and True means "wait for the process to finish"
' Change True to False if you want the VBScript to exit immediately without waiting
WshShell.Run Chr(34) & "C:\current_schedule\run_all_proxy.bat" & Chr(34), 0, True
Set WshShell = Nothing