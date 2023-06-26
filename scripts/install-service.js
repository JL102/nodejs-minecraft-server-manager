var Service = require('node-windows').Service;
 
// Create a new service object
var svc = new Service({
	name:'My Minecraft Server',
	description: 'My Minecraft Server.',
	script: 'scripts/server.js'
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function(){
	console.log("Uninstall complete. Reinstalling...");
	svc.install();
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function(){
	svc.start();
});

if (svc.exists) {
	// Uninstall the service.
	svc.uninstall();
}
else {
	// Install the service.
	svc.install();
}