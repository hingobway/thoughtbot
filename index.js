console.log('Preparing...');

// Bring in dependencies
const https = require('https'),
  qs = require('querystring'),
  fs = require('fs'),
  low = require('lowdb'),
  FileSync = require('lowdb/adapters/FileSync'),
  disc = require('discord.js'),
  req = require('request'),
  moment = require('moment'),
  twitter = require('twitter'),
  events = require('events');

// Init global refs
const e = new events.EventEmitter();
const adapter = new FileSync('storage.json');
const db = low(adapter);

// Init global vars
let twitterUser = {},
  go = false,
  round = 0,
  tweets = [],
  votes = [],
  users = [],
  bot = new disc.Client();

// Set db schema
db.defaults({
  config: {
    twitter: {
      consumerKey: '',
      consumerSecret: '',
      accessTokenKey: '',
      accessTokenSecret: '',
      username: ''
    },
    discord: {
      token: 'TOKEN',
      serverID: '',
      channelName: ''
    },
    google: {
      editURL: '',
      getScriptURL: ''
    }
  },
  options: {
    tweetsPerVote: 5,
    adminPermission: 'MANAGE_MESSAGES',
    cooldown: {
      toNextVote: 180,
      toEndVote: 3
    },
    votesToEnd: {
      min: 3,
      max: 8
    }
  },
  round: 0
}).write();

// Return requested db entry
const get = path => db.get(path).value();

// Init connections
let chan;
bot.login(get('config.discord.token')).catch(() => require('./config'));
let client = new twitter({
  consumer_key: get('config.twitter.consumerKey'),
  consumer_secret: get('config.twitter.consumerSecret'),
  access_token_key: get('config.twitter.accessTokenKey'),
  access_token_secret: get('config.twitter.accessTokenSecret')
});

// Return embed block for vote check
const votestart = (r, choices) => ({
  embed: {
    title: `@${twitterUser.screen_name} Vote - Round ` + r,
    description:
      '[Submit entries here](' +
      get('config.google.editURL') +
      ') that could be used next round!',
    url: 'https://twitter.com/' + twitterUser.screen_name,
    color: parseInt(twitterUser.profile_link_color, 16),
    footer: {
      icon_url: twitterUser.profile_image_url_https,
      text: `@${twitterUser.screen_name} bot`
    },
    fields: [
      {
        name: 'Choices',
        value: '```' + choices + '```'
      },
      {
        name: 'Instructions',
        value:
          'Use the `.v [number]` command to vote for your favorite tweet.\nIf all options are unsatisfying, you can use `.v 0` to vote for a redo.'
      },
      {
        name: 'How it works',
        value: `Every ${get('options.cooldown.toNextVote') /
          60} hours, the bot generates ${get(
          'options.tweetsPerVote'
        )} possible tweets using segments from the spreadsheet of your entries. Once a reasonable chance to vote has elapsed, or has been overridden by an admin, the winning tweet will be posted. At that point, the next timer will start.`
      }
    ]
  }
});

// request :TWEETS_PER_VOTE tweets from the Google server
const requ = () =>
  new Promise((resolve, reject) => {
    req(
      get('config.google.getScriptURL') + '?n=' + get('options.tweetsPerVote'),
      (err, res, body) => {
        if (err) return reject(err);
        let resp = JSON.parse(body);
        if (resp.status != 200) return reject(resp.error);
        resolve(resp.messages);
      }
    );
  });

// init voting process, post entries, start vote collection
function voting() {
  let chan = bot.guilds
    .get(get('config.discord.serverID'))
    .channels.find('name', get('config.discord.channelName'));
  chan
    .send(votestart('...', 'Loading...'))
    .then(message => {
      requ()
        .then(arr => {
          tweets = arr;
          round = get('round');
          round++;
          db.set('round', round).write();
          let choices = tweets
            .map((cur, ind) => `${ind + 1}: ${cur}`)
            .join('\n');
          message.edit(votestart(round, choices)).then(() => {
            go = true;
            e.once('complete', res => {
              chan
                .send(
                  'https://twitter.com/' +
                    twitterUser.screen_name +
                    '/status/' +
                    res.id_str,
                  {
                    embed: {
                      description: res.text,
                      timestamp: moment()
                        .add(get('options.cooldown.toNextVote'), 'minutes')
                        .toISOString(),
                      author: {
                        name: `${twitterUser.name} (@${
                          twitterUser.screen_name
                        })`,
                        icon_url: twitterUser.profile_image_url_https,
                        url: 'https://twitter.com/' + twitterUser.screen_name
                      },
                      footer: {
                        icon_url:
                          'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
                        text: 'Next round is'
                      }
                    }
                  }
                )
                .catch(error => {
                  console.log(new Error(error));
                  process.exit(1);
                });
              let wait = get('options.cooldown.toNextVote') * 60000;
              let currentRound = get('round');
              setTimeout(() => {
                if (!go && get('round') == currentRound) {
                  voting();
                }
              }, wait);
            });
          });
        })
        .catch(error => {
          console.log(new Error(error));
          process.exit(1);
        });
    })
    .catch(error => {
      console.log(new Error(error));
      process.exit(1);
    });
}

// end vote collection and tally votes
e.on('tally', () => {
  if (go) {
    go = false;
    let win = 0;
    let winval = 0;
    let spot = 0;
    let tally = [0, 0, 0, 0, 0, 0];
    for (j = 0; j < votes.length; j++) {
      spot = votes[j];
      tally[spot]++;
    }
    for (k = 0; k < tally.length; k++) {
      if (tally[k] > winval) {
        win = k;
        winval = tally[k];
      }
      if (tally[k] == winval) {
        var final = Math.round(Math.random());
        if (final == 0) {
          win = k;
          winval = tally[k];
        }
      }
    }
    votes = [];
    users = [];
    if (win == 0) {
      e.removeAllListeners('complete');
      round = round - 1;
      db.set('round', round).write();
      voting();
    } else {
      win = win - 1;
      client.post(
        'statuses/update',
        {
          status: tweets[win]
        },
        (err, res, body) => {
          if (res.id_str) {
            e.emit('complete', res);
          } else {
            console.log(new Error(err));
          }
        }
      );
    }
  }
});

// inital start
bot.on('ready', () => {
  client.get(
    'users/show',
    { screen_name: get('config.twitter.username') },
    (err, res, obj) => {
      if (err) {
        console.log(new Error(err));
        process.exit(1);
      }
      twitterUser = res;
      voting();
      console.log('Successfully started and listening.');
    }
  );
});

// manage incoming messages
bot.on('message', message => {
  if (
    go &&
    message.guild.id === get('config.discord.serverID') &&
    message.channel.name === get('config.discord.channelName')
  ) {
    if (message.content.match(/\.v [0-9]+/i)) {
      let ind = users.indexOf(message.member.id);
      let num = parseInt(message.content.slice(3));
      if (num <= tweets.length) {
        if (ind == -1) {
          users.push(message.member.id);
          votes.push(num);
          message.reply('vote cast.');
          if (
            get('options.votesToEnd.max') != 0 &&
            votes.length >= get('options.votesToEnd.max')
          ) {
            e.emit('tally');
          }
        } else {
          votes[ind] = num;
          message.reply('you already voted, but I replaced your vote.');
        }
        setTimeout(() => {
          if (votes.length >= get('options.votesToEnd.min')) {
            e.emit('tally');
          }
        }, get('options.cooldown.toEndVote') * 60000);
      }
    } else if (message.content.match(/^\.tgo$/i)) {
      if (message.member.hasPermission(get('options.adminPermission'))) {
        e.emit('tally');
      } else {
        message.reply(
          'sorry, you need the "' +
            get('options.adminPermission') +
            '" permission to override the vote clock.'
        );
      }
    }
  } else if (
    message.content.match(/^\.toverride$/i) &&
    message.member.hasPermission(get('options.adminPermission'))
  ) {
    go = true;
    voting();
  }
});
