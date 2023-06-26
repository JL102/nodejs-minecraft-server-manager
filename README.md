## Node.js Minecraft server manager (Windows)

Instructions for use:

1. Place the latest version of Paper into the root of the project (same place as this README file)
1. Edit `stream.bat`, `run-server.bat`, `scripts/install-service.js`, and server.properties to include the name for your Minecraft server
1. Inside `scripts`, run `npm install`
1. Double-click on `stream.bat` and keep the window open. It will open a webhook to the NodeJS server instance to let you issue commands. 
	- While the NodeJS server is NOT running, it will repeatedly attempt to reconnect.
	- While the NodeJS server is running but the Minecraft server is NOT running, the server allows you to enter the command `start` to start the server process.
	- While the Minecraft server is running, it has a few hard-coded commands: `show-vars` for debugging, `force-stop` to force-kill the Minecraft process (USE WITH CAUTION), `restart-when-ready`, `restart <message>` / `restart --immediate <message>` to gracefully restart the server, and `stop` to gracefully stop the server. All other messages from the console will be forwarded to the MC server process.
	- Note: If an OP issues `/stop` in-game, then the NodeJS process will automatically restart the server when it detects the game has closed. The only way to stop the server without restarting is through the Webhook console.
1. Run `install-service.bat` as administrator
1. Go to the Services app in Windows and check the status of the service that was installed. You can right click it to restart the service if necessary, but be warned, that will force-stop the Minecraft instance and may result in corrupted data.

**IMPORTANT:** Make sure that the port 8001 is blocked in your firewall settings. If it's opened up to allow remote connections to that port, then anyone can control your Minecraft server instance via the console.