const SOURCE_CHANNEL = '##########';
const TARGET_CHANNEL = '##########';
const BOT_TOKEN = '################################';

// Emojis which are randomely appended to messages
const FACES = [
	'(・`ω´・)',
	';;w;;',
	'owo',
	'OwO',
	'uwu',
	'UwU',
	'>w<',
	'^w^',
	'>.<',
	'>_<',
	'=w=',
	'^-^',
	'O_o',
	'òwó',
	'ÒwÓ',
	':3',
	'>:3'
];

// Words replacements which bypass the REPLACEMENTS var
const WORD_REPLACEMENTS = {
	'you\'re': 'ur',
	'youre': 'ur',
	'your': 'ur',
	'you': 'u',
	'no': 'nu',
	'this': 'dis',
	'that': 'dat',
	'have': 'hav',
	'for': 'furr',
	'is': 'iz',
	'not': 'nut',
	'ty': 'thank u',
	'good': 'gud',
	'my': 'mai',
	'kys': 'ily',
	'does': 'doez',

	// Ignore those
	'do': 'do',
	'don\'t': 'dont',
	'dont': 'dont'
}

// Regexes that are used to process words not in the WORD_REPLACMEENTS object
// They are applied to the string in the order in which they are defined
// With the value being replaced by the key
const REPLACEMENTS = {
	'': /'$/gi,
	'yi$1': /^ye(s*)$/gi,
	'yiff': /^fap+/gi,
	'$1w$2': /([pfdgj])r?([aeiou])/gi,
	'cc': /ck/gi,
	'uv': /ove/gi,
	'u': /(?!^o+f$)(?:oo(?!o)|o(?=o))/gi,
	'w$1': /^wh([a-z]+)$/ig,
	'$1': /^(\w{2,})e$/ig,
	'$1d': /([^e])ed$/ig,
	'r': /er/ig,
	'z': /es$/ig,
	'ny$1': /(?!ne$)ni?([aeiou])/gi,
	'i': /(y|ie|ee)s?$/gi,
};

// Things that should be ignored, links and emojis
const DO_NOT_AFFECT_REGEX = /https?:\/\/[^ ]+|<a?:\w+:\d+>/g;

// =========================================================

process.on('unhandledRejection', err => {
	// Throws the entire process when there is a Unhandled Promise Rejection
	console.error(err);
	process.exit(666);
});

const Discord = require('discord.js');
const client = new Discord.Client();

const {escapeMarkdown} = Discord.Util;

/**
 * Furrifies the entire string
 * @param {string} input The string to furrify
 * @returns {string} The furrified input
 */
function furry(input) {
	const words = String(input).split(/(?=\s)/g);

	let result = '';

	for (let word of words) {
		const [, spacesBefore, content, spacesAfter] = word.match(/^(\s*)(.*?)(\s*)$/);

		result += spacesBefore + processWord(content) + spacesAfter;
	}

	result = result.replace(
		/\s?\!+\s?/g,
		' ' + FACES[Math.floor(Math.random() * FACES.length)] + ' '
	);

	if (!Math.floor(Math.random() * 8)) {
		result += ' ' + FACES[Math.floor(Math.random() * FACES.length)];
	}

	if (!Math.floor(Math.random() * 8)) {
		result = FACES[Math.floor(Math.random() * FACES.length)] + ' ' + result;
	}

	return result;
}

/**
 * Called by `furry()` to furrify a single word
 * @param {string} word The word to furrify
 * @returns {string} The furrified word
 */
function processWord(word) {
	let result = String(word);

	if (FACES.some(face => face.toLowerCase() === word.toLowerCase())) {
		return '**' + word + '**';
	}

	if (word.toLowerCase() in WORD_REPLACEMENTS) {
		result = WORD_REPLACEMENTS[word.toLowerCase()];
	} else {
		for (const [to, from] of Object.entries(REPLACEMENTS)) {
			result = result.replace(from, to);
		}
	}
	
	if (word.toUpperCase() === word) {
		result = result.toUpperCase();
	} else {
		result = result.toLowerCase();
	}

	const originalLinks = word.match(DO_NOT_AFFECT_REGEX);
	const newLinks = result.match(DO_NOT_AFFECT_REGEX);
	

	if (originalLinks && newLinks) {
		for (const i of Object.keys(newLinks)) {
			if (i < originalLinks.length) {
				result = result.replace(newLinks[i], originalLinks[i])
			}
		}
	}

	return result;
}

/**
 * Gets the displayed name of a user in any channel
 * @param {Discord.User|Discord.GuildMember} user The user to get the displayed name of
 * @param {Discord.Channel} channel The channel where the name applies
 * @param {boolean} [withHash=false] If the discriminator should be included at the end
 * @returns {string} The displayed name of the user
 */
function nick(user, channel, withHash = false) {
	if (!(channel instanceof Discord.Channel)) {
		throw new TypeError(
			'Argument \'channel\' must be an instance of a Discord Channel'
		);
	}

	if (user instanceof Discord.GuildMember) {
		user = user.user;
	}

	if (!(user instanceof Discord.User)) {
		throw new TypeError(
			'Argument \'user\' must be an instance of a Discord GuildMember or User'
		);
	}

	let name = user.username;

	// Group DM channels with nicknames
	if (
		channel instanceof Discord.GroupDMChannel &&
		channel.nicks &&
		channel.nicks.has(user.id)
	) {
		name = channel.nicks.get(user.id);
	}

	// Voice channels, Guild Text Channels, and Category Channels
	if (
		channel instanceof Discord.GuildChannel &&
		channel.guild.members.has(user.id)
	) {
		name = channel.guild.members.get(user.id).displayName;
	}

	return name + (withHash ? '#' + user.discriminator : '');
}

/**
 * "Diffuses" user and role mentions in messages by replacing them by the nick
 * By "diffusing" I mean preventing them from pinging people
 * @param {Discord.Message} message The message to diffuse the content of
 * @returns {string} the diffused content of the message
 */
function escapeMentions(message) {
	const channel = message.channel;

	return message.content
		.replace(/@(everyone|here)/g, '**@\u2060$1**')
		.replace(/<@!?(\d+)>/g, (input, id) => {
			const user = message.client.users.get(id);

			if (user) {
				return `**@${escapeMarkdown(nick(user, channel))}**`
			}

			return `**${input}**`;
		})
		.replace(/<@&(\d+)>/g, (_, id) => {
			const role = channel.guild ? channel.guild.roles.get(id) : null;

			if (role) {
				return `**@${escapeMarkdown(role.name)}**`;
			}
			
			return '**@deleted-role**';
		})
		.replace(/<(@[!&]?\d+)>/g, '<\u2060$1>');
}

console.log('[1/3] Connecting...');

client.login(BOT_TOKEN).then(async () => {
	console.log('[2/3] Loading members...');

	const sourceChannel = client.channels.get(SOURCE_CHANNEL);
	const targetChannel = client.channels.get(TARGET_CHANNEL);

	if (!(sourceChannel instanceof Discord.TextChannel)) {
		throw new TypeError('Source Channel must be a TextChannel');
	}

	if (!(targetChannel instanceof Discord.TextChannel)) {
		throw new TypeError('Target Channel must be a TextChannel');
	}

	await sourceChannel.guild.fetchMembers();

	console.log('[3/3] Preparing WebHooks...');

	const webhooks = [];

	await Promise.all([
		// This Promise attempts creating new webhooks
		// until it gets an error indicating the channel is full
		(async () => {
			try {
				while (webhooks.length < 100) { // In case we ever get unlimited WebHooks ^-^
					const newWebhook = await targetChannel.createWebhook('furry');

					console.log(`Created new WebHook ${newWebhook.id}`);

					webhooks.push(newWebhook);
				}
			} catch (err) {
				if (err.code !== 30007) {
					throw err;
				}
			}
		})(),
		// This promise just fetches the webhooks and push them into the webhooks array
		targetChannel.fetchWebhooks()
			.then(channelWebhooks => {
				for (const [, val] of channelWebhooks) {
					webhooks.push(val);
				}
			})
	]);

	console.log('\nReady >:3');

	let currentWebhook = 0;

	client.on('message', message => {
		if (message.channel.id !== SOURCE_CHANNEL) {
			return;
		}

		const attachments = message.attachments.map(attachment => ({
			name: attachment.filename,
			attachment: attachment.url
		}));

		if (message.content.length > 0 || attachments.length > 0) {
			webhooks[currentWebhook].send(
				furry(escapeMentions(message)).substr(0, 2000),
				{
					username: furry(
						nick(message.author, message.channel)
					).substr(0, 32),
					avatarURL: message.author.displayAvatarURL,
					files: attachments
				}
			);

			currentWebhook = (currentWebhook + 1) % webhooks.length;
		}
	});
});
