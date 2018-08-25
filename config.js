const prompt = require('prompt');
const ansi = require('ansi-colors');
const fs = require('fs');

console.log(
  `\nLooks like this is your first time running the bot.\n\nThis utility will help you set everything up. There are a lot of things you'll need here, for a rundown go to`,
  ansi.underline(`\nhttps://github.com/hingobway/thoughtbot/wiki/Installation`),
  `\nOnce you have everything ready, use this utility to insert it all.\n`
);

prompt.start();

prompt.message = '';
prompt.delimiter = '';

prompt.start();

prompt.get(
  {
    properties: {
      discordToken: {
        required: true,
        message: 'Invalid token.',
        description:
          ansi.whiteBright.underline(`Discord Bot Setup\n`) +
          ansi.white(
            `First, I need your bot token from the Discord API website.\n`
          ) +
          `Discord Token:`
      },
      discordServerID: {
        pattern: /^[0-9]{18}$/,
        message: 'Invalid ID.',
        description:
          ansi.white(
            `Now, I need the ID of the server you want to run this on. (Only one server for now!)\n`
          ) + `Server ID:`
      },
      discordChannelName: {
        pattern: /^[a-z0-9\-_]+$/i,
        message: 'Invalid channel name.',
        default: 'twitter',
        description:
          ansi.white(
            `Thoughtbot runs in its own channel. Make sure you've already created this channel and that the bot can read/write messages there. Below you can specify the name of that channel.\n`
          ) + `Channel name:`
      },
      googleEditURL: {
        pattern: /^https:\/\/docs\.google\.com\/spreadsheets\/.+\/edit$/i,
        message: `Invalid spreadsheet URL. Make sure it ends in "/edit", remove anything after that.`,
        required: true,
        description:
          ansi.whiteBright.underline(`\nSpreadsheet Setup\n`) +
          ansi.white(
            `First, I need the direct link to the spreadsheet for tweet generation. This is the page where you would add tweet bits.\n`
          ) +
          `Spreadsheet URL:`
      },
      googleGetScriptURL: {
        pattern: /^https:\/\/script\.google\.com\/macros\/.+\/exec$/i,
        message: `Invalid script URL. Make sure it ends with "/exec", otherwise you have the wrong link.`,
        required: true,
        description:
          ansi.white(
            `Now, I need the GET link so the bot can retrieve tweets. This is the link found inside Google Apps Scripts.\n`
          ) + `Script URL:`
      },
      twitterConsumerKey: {
        required: true,
        message: 'Invalid consumer key.',
        description:
          ansi.whiteBright.underline(`\nTwitter Bot Setup\n`) +
          ansi.white(
            `These 4 credentials can be found at app.twitter.com and allow the bot to tweet.\n`
          ) +
          `Consumer Key:`
      },
      twitterConsumerSecret: {
        required: true,
        message: 'Invalid consumer secret.',
        description: `Consumer Secret:`
      },
      twitterAccessToken: {
        required: true,
        message: `Invalid access token.`,
        description: `Access Token:`
      },
      twitterAccessTokenSecret: {
        required: true,
        message: `Invalid access token secret.`,
        description: `Access Token Secret:`
      },
      twitterUsername: {
        required: true,
        message: `Invalid username.`,
        description:
          ansi.white(`Please also enter your bot's twitter handle \n`) +
          `Twitter Handle: ` +
          ansi.white('@')
      },
      optionsTweetsPerVote: {
        type: 'integer',
        default: 5,
        description:
          ansi.whiteBright(`\nBot Options\n`) +
          ansi.white(
            `Here are the configuration options; the defaults are in parentheses.\nSet the number of tweets to be generated with each voting session\n`
          ) +
          `Tweets per Session:`
      },
      optionsCooldownToNextVote: {
        type: 'number',
        default: 180,
        description:
          ansi.white(
            `Set the number of minutes between the end of one voting session and the start of the next\n`
          ) + `Session Cooldown Time:`
      },
      optionsCooldownToEndVote: {
        type: 'number',
        default: 3,
        description:
          ansi.white(
            `Set the number of minutes to keep voting open after the minimum number of votes has been reached\n`
          ) + `Vote End Cooldown Time:`
      },
      optionsVotesToEndMin: {
        type: 'integer',
        default: 3,
        description:
          ansi.white(
            `Set the minimum number of votes before a winner is chosen (this can stil be overriden with .tgo) \n`
          ) + `Minimum Votes to End:`
      },
      optionsVotesToEndMax: {
        type: 'integer',
        default: 8,
        description:
          ansi.white(
            `Set the maximum number of votes entered before a winner is immediately chosen. \n`
          ) + `Maximum Votes to End:`
      },
      optionsAdminPermission: {
        default: 'MANAGE_MESSAGES',
        description:
          ansi.white(
            `Set the permission that equates to a bot admin; find in the Permission column of the table linked below\nhttps://discordapp.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags\n`
          ) + `Admin Permission:`
      }
    }
  },
  (err, r) => {
    fs.writeFileSync(
      'storage.json',
      JSON.stringify({
        config: {
          twitter: {
            consumerKey: r.twitterConsumerKey,
            consumerSecret: r.twitterConsumerSecret,
            accessTokenKey: r.twitterAccessToken,
            accessTokenSecret: r.twitterAccessTokenSecret,
            username: r.twitterUsername
          },
          discord: {
            token: r.discordToken,
            serverID: r.discordServerID,
            channelName: r.discordChannelName
          },
          google: {
            editURL: r.googleEditURL,
            getScriptURL: r.googleGetScriptURL
          }
        },
        options: {
          tweetsPerVote: r.optionsTweetsPerVote,
          adminPermission: r.optionsAdminPermission,
          cooldown: {
            toNextVote: r.optionsCooldownToNextVote,
            toEndVote: r.optionsCooldownToEndVote
          },
          votesToEnd: {
            min: r.optionsVotesToEndMin,
            max: r.optionsVotesToEndMax
          }
        }
      }),
      'utf-8'
    );
    console.log(
      ansi.whiteBright(`\n\nThat's it! Start the bot again to begin.`)
    );
    process.exit();
  }
);
