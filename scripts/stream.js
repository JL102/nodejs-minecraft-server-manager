//var logFile = 'C:/Users/Drak/Desktop/drakinite.net/logs/2019_07/2019_07_24.log';

const WS = require('ws');
require('colors');

const ReconnectingWebSocket = require('reconnecting-websocket');
const socket = new ReconnectingWebSocket('ws://localhost:8001', [], {WebSocket: WS});

const input = process.stdin;

socket.onmessage = function(evt) {
	let message = evt.data.toString();
	write(message);
}

socket.onopen = function(evt) {
	write('[WebSocket] ' + 'Connected!'.bgGreen);
}

socket.onclose = function(evt) {
	write('[WebSocket] ' + 'Retrying...'.bgRed);
}

socket.error = function(err) {
	console.error(err);
}

input.on('data', function(data) {
	socket.send(data);
});

function write(txt) {
	if (txt.endsWith('\n')) {
		process.stdout.write(txt);
	}
	else {
		console.log(txt);
	}
}