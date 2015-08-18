console.log('---------------------------------------------------------');
console.log('here we go');
console.log('---------------------------------------------------------');

var arguments = process.argv.slice(2), email = {}, keywords = ["email", "password"];
var mode;

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}

for (var i = 0; i < arguments.length; i++) {
  var arg = "" + arguments[i].toString();
  for (var n = 0; n < keywords.length; n++) {
    var word = keywords[n];
    if (arg.startsWith(word + '=')) { email[word] = arg.substring(word.length + 1); }

    if (arg.startsWith('mode=')) mode = arg.substring(5);
  }
}

mode = mode || process.env.mode;

email['email'] = email['email'] || process.env.my_email;
email['password'] = email['password'] || process.env.my_password;



var express = require('express');
var app = express();

var reload = require('require-reload')(require);

var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session');
var pg = require('pg');
var passport = require('passport'),
   LocalStrategy = require('passport-local').Strategy;
var swig  = require('swig');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passportSocketIo = require("passport.socketio");
var RedisStore = require("connect-redis")(session);

var fs = require("fs");

var channels = require("./js/channels");
var changejs = reload("./public/js/change")
var jsdom = require("jsdom");
jsdom.defaultDocumentFeatures = {
    FetchExternalResources: ["script"],
    ProcessExternalResources: false
};
var winston = require('winston');
var colors = require('colors');
var secure_random = require('secure-random');

var mongo = require('mongodb'),
  MongoClient = mongo.MongoClient,
  BSON = mongo.ObjectID;

var url = require('url');
var redis = require("redis");

var client;
if (mode == 'production') {
  var redisURL = url.parse(process.env.REDIS_URL);
  var client = redis.createClient(redisURL.port, redisURL.hostname);
  client.auth(redisURL.auth.split(":")[1]);
}
else {
  client = redis.createClient();
}

winston.add(winston.transports.File, { filename: 'logs.log' });
winston.remove(winston.transports.Console);

var sessionStore = new RedisStore({client: client});

var async = require('async');

var secretKey = 'keyboard cat';

app.use('/bootstrap', express.static(__dirname + '/bootstrap')); // bootstrap yo
app.use('/rangyinput.js', express.static(__dirname + '/rangyinput.js'));
app.use('/diff.js', express.static(__dirname + '/diff.js'));
app.use('/change.js', express.static(__dirname + '/change.js'));
app.use('/tinycolor.js', express.static(__dirname + '/tinycolor.js'));
app.use('/jquery-1.11.1.js', express.static(__dirname + '/jquery-1.11.1.js'));
app.use('/socket.io-1.2.0.js', express.static(__dirname + '/socket.io-1.2.0.js'));

app.use('/public', express.static(__dirname + '/public'));

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.use(cookieParser(secretKey));
app.use(session({ 
    secret: secretKey,
    key: 'app.sid', 
    resave: true,
    saveUninitialized: true,
    store: sessionStore
}));
app.use(passport.initialize());   // passport initialize middleware
app.use(passport.session());      // passport session middleware 

app.set('port', (process.env.PORT || 80));


if (!email['email']) { console.warn("no email provided, using default".yellow); }
if (!email['password']) { console.warn("no password provided, emails won't send. I mean I'll try. Don't get your hopes up though".yellow)}

function runServer(db, callback) {
  
  function loggedIn(req, res, next) {
      if (req.user) {
          next();
      } else {
          res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
      }
  }

  var notifier = require('./js/notify');
  notifier.init(email, secure_random, db, mode == 'production');

  var stats = require('./js/stats');
  stats.init(email, db);

  require('./js/auth').foo(app, passport, LocalStrategy, db, secure_random, notifier, mode == 'production');
  
  var mySocket = require('./js/socket');
  mySocket.foo(io, passportSocketIo, secretKey, sessionStore, channels, changejs, jsdom, winston, mongo, db, secure_random, async, stats, notifier);

  require('./js/api').foo(app, channels, db, secure_random, async, swig, BSON, mySocket); 
  require('./js/test').foo(app, pg); 


  app.get('/docs/view', loggedIn, function(req, res){
    console.log("req.user: " + JSON.stringify(req.user));

    var collection = db.collection('g');

    collection.findOne({_id:BSON.ObjectID(req.user)}, {user:1, email:1, displayName:1}, function (err, reply) {
      if (err) console.log(err);
      console.log("reply", reply);
      if (reply['user'] && reply['user'].startsWith('gU:')) reply['user'] = reply['user'].substring(3);

      res.end(swig.renderFile(__dirname + "/html/dynamic/page.html", {
        username: reply['user'] || reply['displayName'] || reply['email']
      })); 
    });
  });


  app.get('/errors', function(req, res) {
    
    var collection = db.collection('errors');

    var aggregate = false;

    var find = {}, group = {};

    if (req.query.keys) {
      aggregate = true;

      group = {_id:'$type', len: {'$first' : {'$size':'$errors'}}};
    }
    
    if (aggregate) {
      collection.aggregate([
        {'$match':{}},
        {'$group':group}
      ],
      function (err, replies) {
        res.end(JSON.stringify(replies));
      });
    }
    else {
      collection.find({}).toArray(function (err, replys) {
        res.end(JSON.stringify(replys));
      });
    }

  });

  app.post('/reportError', function(req, res) {
    
    var body = '';
    console.log("error".red);
    console.log(req.body.error.message + " on line #" + req.body.error.line);

    stats.error(req.body.error, 'client ' + req.body.error.message);

    res.end('');
    
  });

  app.use(function(req, res, next) {
    if (req.path.indexOf('.') === -1) {
      var file = __dirname + "/html/static" + req.path + '.html';
      fs.exists(file, function(exists) {
        if (exists) {

          var index = req.url.indexOf('?');
          if (index === -1) {
            req.url += '.html';
          }
          else {
            var b4 = req.url.substring(0, index);
            var after = req.url.substring(index);
            req.url = b4 + '.html' + after;
          }
        }
        next();
      });
    }
    else
      next();
  });

  app.use('/', express.static(__dirname + '/html/static'));


  http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port'));
  });


  callback(null, "success");
}

async.waterfall([

    function (callback) {
      var uri = mode == 'production' ? 'mongodb://porter:'+process.env.My_MongoLab_Password+'@ds027483.mongolab.com:27483/heroku_tw7tpcwn' : 'mongodb://localhost:27017/test';

      console.log("connecting with uri " + uri);
      MongoClient.connect(uri, function(err, db_) {

        if (err){
          callback(err);
          return;
        }

        if (!db_) {
          console.log("db is null".red);
        }

        callback(null, db_);
      });
    },
    runServer
  ],
    function (err, results) {
      console.log("results: " + results);
    }

  )


