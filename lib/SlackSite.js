'use strict';

var os = require('os'),
	fs = require('fs'),
	util = require('util'),
	events = require('events'),
	https = require('https'),
	url = require('url'),
	WebSocket = require('ws');

function logToFile (pieces) {
	var str = [(new Date()).getTime()].concat(pieces).join('\t');
	if(this.logFile)
		this.logFile.write(str + os.EOL);
	else
		console.log(str);
}

class SlackSite extends events.EventEmitter {
	constructor (token, logFile) {
		super();

		this._token = token;
		this._ws = null;

		if(logFile)
			this.logFile = fs.createWriteStream(logFile)
	}

	get (method, parameters) {
		let logToFile = function (pieces) {
				var str = [(new Date()).getTime()].concat(pieces).join('\t');
				if(this.logFile)
					this.logFile.write(str + os.EOL);
				else
					console.log(str);
			}.bind(this);

		logToFile(['request', method, JSON.stringify(parameters, null, '\t')]);

		return new Promise(((resolve, reject) => {

			https.get(
				url.format({
					protocol: 'https',
					hostname: 'slack.com',
					pathname: method,
					port: 443,
					query: parameters
				}),
				((response) => {
					let data = '';
					response.on('data', (d) => data += d.toString());

					response.once('end', (() => {
						data = JSON.parse(data);

						logToFile(['reply', method, JSON.stringify(data, null, '\t')]);
						if(data.ok)
							return resolve(data);

						reject(new Error(data.error || 'Unknown GET error for "' + method + '"'));
					}).bind(this))
				}).bind(this))
				.on('error', (e) => reject(e));
		}).bind(this));
	}

	authenticate () {
		let logToFile = function (pieces) {
				var str = [(new Date()).getTime(), 'event'].concat(pieces).join('\t');
				if(this.logFile)
					this.logFile.write(str + os.EOL);
				else
					console.log(str);
			}.bind(this),
			onOpen = () => {},
			onClose = () => {},
			onMessage = function (data) {
				data = JSON.parse(data);
				this.emit(data.type, data);
			}.bind(this);

		return this.get('/api/rtm.start', {
				token: this._token,
				pretty: true
			})

			// copy over certain attributes from here
			.then(((data) => {
					[
						//'ok',
						'self',
						'team',
						//'latest_event_ts',
						'channels',
						'groups',
						//'ims',
						//'cache_ts',
						'users',
						//'cache_version',
						//'cache_ts_version',
						'bots',
						'url'
					].forEach(((propertyName) => {
						this[propertyName] = data[propertyName];
					}).bind(this));

					return data;
				}).bind(this))

			// Open up the streaming API on a websocket
			.then(((data) => {
				this._ws = new WebSocket(data.url);
			}).bind(this))

			// Also, log streaming API messages to logFile
			.then(((data) => {
				this._ws.on('message', (data) => logToFile([
					JSON.parse(data).type,
					JSON.stringify(JSON.parse(data), null, '\t')
				]));
				if(this.logFile)
					this._ws.on('close', () => this.logFile.end());
			}).bind(this))

			// register all listeners
			.then(((data) => {
				this._ws.on('open', onOpen);
				this._ws.on('close', onClose);
				this._ws.on('message', onMessage);

				return data;
			}).bind(this));

	}

	sendMessage (channel, message) {
		return this.get('/api/chat.postMessage', {
			token: this._token,
			channel: channel,
			text: message,
			username: this.friendlyName()
		});
	}
	sendReaction (message, emoji) {
		return this.get('/api/reactions.add', {
				token: this._token,
				channel: message.channel,
				timestamp: message.ts,
				name: emoji
			});
	}

	friendlyName () {
		return this.self.name;
	}

}

module.exports = SlackSite;