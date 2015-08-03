console.log('---------------------------------------------------------');
console.log('here we go');
console.log('---------------------------------------------------------');

var arguments = process.argv.slice(2), email = {}, keywords = ["email", "password"];
var mode;

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
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

var channels = require("./channels");
var changejs = reload("./change")
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

app.use('/test2', express.static(__dirname + '/test.html'));

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

  var notifier = require('./notify');
  notifier.init(email, secure_random, db, mode == 'production');

  var stats = require('./stats');
  stats.init(email, db);

  require('./auth').foo(app, passport, LocalStrategy, db, secure_random, notifier, mode == 'production');
  
  var mySocket = require('./socket');
  mySocket.foo(io, passportSocketIo, secretKey, sessionStore, channels, changejs, jsdom, winston, mongo, db, secure_random, async, stats, notifier);

  require('./api').foo(app, channels, db, secure_random, async); 
  require('./test').foo(app, pg); 

  app.get('/aval', function(req, res) {
    

    var documents = mySocket.getDocuments();

    var users = {};
    for (key in documents) {
      var len = Object.keys(documents[key][2]).length;
      if (len != 0) {
        users[key] = len;
      }
    }

    res.end(JSON.stringify(users));
  })

  app.get('/', loggedIn, function(req, res){

    var collection = db.collection('documents');

    collection.find({}).toArray(function(err, docs) {
      res.end(swig.renderFile(__dirname + "/index.html", {
        username: JSON.stringify(req.user),
        documents: docs,
      }));
    }); 
  });

  app.get('/docs/view', loggedIn, function(req, res){
    console.log("req.user: " + JSON.stringify(req.user));

    var collection = db.collection('g');

    collection.findOne({_id:BSON.ObjectID(req.user)}, {user:1, email:1, displayName:1}, function (err, reply) {
      if (err) console.log(err);
      console.log("reply", reply);
      if (reply['user'] && reply['user'].startsWith('gU:')) reply['user'] = reply['user'].substring(3);

      res.end(swig.renderFile(__dirname + "/page.html", {
        username: reply['user'] || reply['displayName'] || reply['email']
      })); 
    });

    
  });

  app.get('/login', function(req, res) {
    console.log(req.query);
    res.sendFile(__dirname + "/login.html");

  });

  app.get('/diff', function(req, res) {
    res.sendFile(__dirname + "/diff.html");
  });

  app.get('/admin', function(req, res) {
    res.sendFile(__dirname + "/admin.html");
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

        callback(null, db_);
      });
    },
    runServer
  ],
    function (err, results) {
      console.log(err);
      console.log("results: " + results);
    }

  )


