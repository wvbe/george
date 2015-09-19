var Speak = require('tts-speak');
var speak = new Speak({
	tts: {
		engine: 'google',               // The engine to use for tts
		lang: 'en-us',                  // The voice to use
		cache: __dirname + '/cache',    // The cache directory were audio files will be stored
		loglevel: 0,                    // TTS log level (0: trace -> 5: fatal)
		delayAfter: 500                 // Mark a delay (ms) after each message
	},
	speak: {
		volume: 80,                     // Audio player volume
		loglevel: 0                     // Audio player log level
	},
	loglevel: 0                         // Wrapper log level
});

speak.say('This is just a test');
