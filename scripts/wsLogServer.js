
const ws = require('ws');

var sockets = [];

const wsLogServer = module.exports = {
	log: function(message) {
		for (var socket of sockets) {
			socket.send(message);
		}
	},
	// This function registers a callback for every time a message comes from the websocket.
	//	Callback is fired with the message contents.
	onMessage: function(callback) {
		this._onMessage = function(message) {
			callback(message);
		}
	}
}


const wsServer = new ws.Server({ port: 8001 });
wsServer.on('connection', socket => {
	sockets.push(socket);
	
	//when message comes in, run the onMessage callback
	socket.on('message', data => {
		var message = data.toString();
		if (typeof wsLogServer._onMessage == 'function') {
			wsLogServer._onMessage(message);
		}
		else {
			console.log(message)
		}
	});
});

/*
const input = process.stdin;
input.on('data', function(data) {
	wsLogServer.log(data);
});
*/