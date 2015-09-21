'use strict';

let SpeakSoftly = require('speak-softly'),
	res = new SpeakSoftly(),
	SlackSite = require('./lib/SlackSite');

var profile = process.env.SITE_CONFIG || 'default',
	config = require('./config/' + profile),
	listeners = {
		autoReact: function autoReact (site, config) {
			site.on('message', function (message) {
				if(!message.text || typeof message.text !== 'string')
					return;

				if(!config.keywords.some((keyword) => message.text.toLowerCase().indexOf(keyword) >= 0))
					return;

				site.sendReaction(message, config.emoji).catch(dumpError);
			});
		}
	},
	site = new SlackSite(config.token, './logs/' + profile + '.txt');

function dumpError(err) {
	res.error(err.stack);
}

site.authenticate()
	.then(function () {
		res.caption('Connection');

		res.properties({
			'Status': 'Authenticated',
			'Team name': site.team.name,
			'Bot': site.self.name + ' @ ' + site.team.domain
		});

		res.caption('Channels');
		res.properties(site.channels
			.filter((channel) => !channel.is_archived && channel.is_channel)
			.map((channel) => [
					channel.is_member ? 'Joined' : '',
					channel.name
				]));
	})
	.then(function () {
		res.caption('Setting listeners');
		(config.listeners || []).forEach((listener) => {
			var listenerName = listener[0],
				listenerConfig = listener[1];

			res.log('Listener "' + listenerName + '"');
			res.debug(listenerConfig);
			listeners[listenerName](site, listenerConfig);
		});
	})
	.catch(function (err) {
		res.error(err.stack);
	});
