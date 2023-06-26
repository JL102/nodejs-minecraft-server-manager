//Note to future self: Sorry for the spaghetti code.

// Require Node.js standard library function to spawn a child process
const spawn = require('child_process').spawn;
const wsLogServer = require('./wsLogServer');
const path = require('path');
const fs = require('fs');

// Get process.stdin as the standard input object.
var input = process.stdin;

// Set input character encoding.
input.setEncoding('utf-8');

// Server will automatically reboot UNLESS isRebooting == false.
var isAutoReboot = true;

//Bool to check if server is still running. Is set during boot and disabled on exit.
var isServerRunning = false;

//Timeout variable for reboot process to be cleared, so that if i manually stop the server, the timeout isn't executed multiple times
var timeoutForRebootProcess;

//Server process.
var minecraftServerProcess, timeServerProcessStarted;

// When user inputs data and hits enter.
input.on('data', function (data) {
	onInput(data);
});

// When input comes from the websocket.
wsLogServer.onMessage(function (data) {
	onInput(data);
});

const javaPath = 'java';

function getJarPath() {
	const jarBase = path.join(__dirname, '../');
	const files = fs.readdirSync(jarBase);
	files.sort((a, b) => b.localeCompare(a)); // reverse the order of the files
	
	for (let file of files) {
		// Return the first file that starts with paper and ends in .jar
		if (file.startsWith('paper') && file.endsWith('.jar')) {
			return file;
		}
	}
}

writeToStream(getJarPath() + '\n');

var numFailedAttempts = 0;

//Boot server.
bootServer();

function bootServer(){
	
	let newJarPath = getJarPath();
	
	writeToStream(`Starting server... -- jarPath="${newJarPath}"\n`);
	
	isAutoReboot = true;
	
	//java -server -Xmx1024M -XX:+UseConcMarkSweepGC -XX:+UseParNewGC -XX:+CMSIncrementalPacing -XX:ParallelGCThreads=2 -XX:+AggressiveOpts -jar minecraft_server.jar nogui
	// NEW: https://mcflags.emc.gs/
	// java -Xms10G -Xmx10G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -jar paperclip.jar nogui
	
	// Create a child process for the Minecraft server using the same java process
	// invocation we used manually before
	timeServerProcessStarted = Date.now();
	minecraftServerProcess = spawn(javaPath, [
		//'-Xms1G',
		//'-Xmx1G',
		'-Xms5G',
		'-Xmx5G',
		'-XX:+UseG1GC',
		'-XX:+ParallelRefProcEnabled',
		'-XX:MaxGCPauseMillis=200',
		'-XX:+UnlockExperimentalVMOptions',
		'-XX:+DisableExplicitGC',
		'-XX:+AlwaysPreTouch',
		'-XX:G1NewSizePercent=30',
		'-XX:G1MaxNewSizePercent=40',
		'-XX:G1HeapRegionSize=8M',
		'-XX:G1ReservePercent=20',
		'-XX:G1HeapWastePercent=5',
		'-XX:G1MixedGCCountTarget=4',
		'-XX:InitiatingHeapOccupancyPercent=15',
		'-XX:G1MixedGCLiveThresholdPercent=90',
		'-XX:G1RSetUpdatingPauseTimePercent=5',
		'-XX:SurvivorRatio=32',
		'-XX:+PerfDisableSharedMem',
		'-XX:MaxTenuringThreshold=1',
		'-Dusing.aikars.flags=https://mcflags.emc.gs',
		'-Daikars.new.flags=true',
		'-jar',
		getJarPath(),
		'nogui'
	]);
	
	minecraftServerProcess.stdout.on('data', log);
	minecraftServerProcess.stderr.on('data', log);
	
	//When it is closed DURING REBOOT PROCESS ONLY (isAutoReboot), boot back up.
	minecraftServerProcess.on('close', function(exitCode){
		
		//When server has closed, set isRunning to false.
		isServerRunning = false;
		
		// here, we know that it exited cleanly, so we can reset numFailedAttempts
		if (exitCode === 0) {
			numFailedAttempts = 0;
			if(isAutoReboot){
				//Boot server
				bootServer();
			}
		}
		else {
			numFailedAttempts++;
			if (numFailedAttempts >= 10) {
				log('Too many failed attempts!!! Abandoning ship\n');
				return;
			}
			else {
				setTimeout(bootServer, 50);
			}
		}
	});
	
	//When server has booted, set isRunning to true.
	//isServerRunning = true; moving this statement into the log function; Only set to true when it's fully ready
	
	writeToStream("To SAVE AND EXIT the server, type 'stop'. To EXIT node.js, type 'exit'.\n");
	writeToStream("**IMPORTANT**\n\tMake sure the window does not say \"Select\" in the title. That will pause all script execution.\n**IMPORTANT**\n");
}

function writeToStream(message) {
	process.stdout.write(message);
	wsLogServer.log(message);
}

function onInput(data) {
	
	//Trim whitespace
	data = data.trim();
	
	//for debugging
	if (data === 'show-vars') {
		writeToStream(`isAutoReboot=${isAutoReboot}, isServerRunning=${isServerRunning}, rebootTimeout=${timeoutForRebootProcess}, isAutoReboot=${isAutoReboot}`);
	}
	//If user inputs process.kill, kill server
	else if( (data === "exit" || data === "kill") && !isServerRunning){
		
		writeToStream("Killing node.\n");
		
		process.exit();
	}
	//If server is not running and user inputs start, boot server
	else if(data === "start" && !isServerRunning){
		
		writeToStream("Starting server.\n");
		
		bootServer();
	}
	else if (data === "force-stop"){
		writeToStream("Force-killing server.\n");
		// Force stop for if java fricks up
		try {
			minecraftServerProcess.kill('SIGINT');
		}
		catch (err) {
			writeToStream(JSON.stringify(err));
		}
	}
	else if (data === 'restart-when-ready') {
		// Make the server reboot after it has been stopped.
		writeToStream('Will restart server when it has safely shut down.\n');
		isAutoReboot = true;
	}
	//manual reboot (with message)
	else if (data.startsWith('restart') && isServerRunning == true) {
		//if --immediate flag is present, reboot immediately
		if (data.includes('--immediate') || data.includes('-i')) {
			// remove the arguments from the message, then grab the custom message
			data = data.replace('--immediate', '').replace('-i', '').replace(/  /g, ' ');
			var customMessage = data.substring(8, data.length).trim();
			
			writeToMinecraftServer('Rebooting...');
			//Execute reboot.
			reboot(customMessage);
		}
		//otherwise, reboot in 20 seconds with a custom message
		else {
			var customMessage = data.substring(8, data.length).trim();
			var message;
			if (!customMessage) message = 'alert Manual reboot in 20 seconds.';
			else message = `alert Manual server reboot in 20 seconds: ${customMessage.trim()}`;
			
			//initialize reboot message
			writeToMinecraftServer(message);
			
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting in 10 seconds.");
			}, 10000);
			
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting in 5 seconds.");
			}, 15000);
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting in 4 seconds.");
			}, 16000);
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting in 3 seconds.");
			}, 17000);
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting in 2 seconds.");
			}, 18000);
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting in 1 second.");
			}, 19000);
			setTimeout(function(){
				writeToMinecraftServer("say Rebooting...");
				//Execute reboot.
				reboot(customMessage);
			}, 20000);
		}
	}
	else if (data === 'stop' && isServerRunning == true) {
		writeToStream('Stop requested; Disabling isRebooting');
		
		isAutoReboot = false;
		writeToMinecraftServer(data);
	}
	//Otherwise, write the input to the server.
	else{
		//If server is running, send command to server.
		if(isServerRunning){
			
			writeToMinecraftServer(data);
		}
		//If server is not running, send error to user.
		else{
			
			writeToStream("Unknown command. To start server, type 'start'. To restart, type 'restart'. To kill node, type 'exit' or 'kill'.");
		}
	}
}

// Listen for events coming from the minecraft server process - in this case,
// just log out messages coming from the server
function log(data) {
	var dataString = data.toString();
	//get rid of those awful ass sleep messages
	if (!dataString.match(/(count=|i=|index=|index2=|String[0-9]=|color)+/g)) {
		writeToStream(dataString);
	}
	
	//if process is ready AND server is not yet running, then go to prepare-for-reboot
	if(data.includes("Done") && data.includes("For help") && !isServerRunning){
		//set isRunning to true
		isServerRunning = true;
		
		//Create new Date, "tomorrow at 5:00 AM."
		var currentDate = new Date();
		var rebootDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 05);
		var timeDelta = rebootDate.valueOf() - currentDate.valueOf();
		
		//Log
		writeToMinecraftServer(`say Successfully booted server at ${currentDate}. (Time elapsed: ${((currentDate - timeServerProcessStarted)/1000).toFixed(2)} seconds)`);
		writeToMinecraftServer(`say Preparing to reboot at ${rebootDate}, in ${(timeDelta/360000).toFixed(2)} hours.`);
		
		//In case there's already a timeout for reboot, clear it before I set it again.
		clearTimeout(timeoutForRebootProcess);
		
		//Prepare reboot.
		timeoutForRebootProcess = setTimeout(prepareForReboot, timeDelta);
	}
}

function writeToMinecraftServer(command){
    minecraftServerProcess.stdin.write(command+'\n');
}

function prepareForReboot(){
	
	writeToMinecraftServer("alert Rebooting in 5 minutes.");
	
	//in 4 minutes, do the 1 minute countdown
	setTimeout(function(){
	
		writeToMinecraftServer("alert Rebooting in 1 minute.");
	
		setTimeout(function(){
			writeToMinecraftServer("say Rebooting in 30 seconds.");
		}, 30000);
		
		setTimeout(function(){
			writeToMinecraftServer("say Rebooting in 15 seconds.");
		}, 45000);
		
		setTimeout(function(){
			writeToMinecraftServer("say Rebooting in 5 seconds.");
		}, 55000);
		
		setTimeout(function(){
			writeToMinecraftServer("say Rebooting...");
		}, 60000)
		
		setTimeout(function(){
			writeToMinecraftServer("say Rebooting...");
			
			//Execute reboot.
			reboot();
		}, 62000);
		
	}, 240000);
}

function reboot(customMessage){
	
	//Set isRebooting to true
	isAutoReboot = true;
	
	if (customMessage) writeToMinecraftServer("kickall " + customMessage);
	else writeToMinecraftServer("kickall Server is restarting.");
	
	setTimeout(() => {
		//Tell server to save and exit.
		writeToMinecraftServer("stop");
	}, 10);
}