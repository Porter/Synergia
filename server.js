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
var redis = require("redis"),
        client = redis.createClient();
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
  MongoClient = mongo.MongoClient;

winston.add(winston.transports.File, { filename: 'logs.log' });
winston.remove(winston.transports.Console);

var sessionStore = new RedisStore(redis);

var async = require('async');

var secretKey = 'keyboard cat';

app.use('/bootstrap', express.static(__dirname + '/bootstrap')); // bootstrap yo
app.use('/rangyinput.js', express.static(__dirname + '/rangyinput.js'));
app.use('/diff.js', express.static(__dirname + '/diff.js'));
app.use('/change.js', express.static(__dirname + '/change.js'));
app.use('/tinycolor.js', express.static(__dirname + '/tinycolor.js'));
app.use('/jquery-1.11.1.js', express.static(__dirname + '/jquery-1.11.1.js'));
app.use('/socket.io-1.2.0.js', express.static(__dirname + '/socket.io-1.2.0.js'));
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

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}

var arguments = process.argv.slice(2), email = {}, keywords = ["email", "password"];

for (var i = 0; i < arguments.length; i++) {
  var arg = "" + arguments[i].toString();
  for (var n = 0; n < keywords.length; n++) {
    var word = keywords[n];
    if (arg.startsWith(word + '=')) { email[word] = arg.substring(word.length + 1); }
  }
}

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


  var stats = require('./stats');
  stats.init(email, db);

  require('./auth').foo(app, passport, LocalStrategy, db, secure_random);
  
  var mySocket = require('./socket');
  mySocket.foo(io, passportSocketIo, secretKey, sessionStore, redis, client, channels, changejs, jsdom, winston, mongo, db, secure_random, async, stats);

  require('./api').foo(app, channels, db, secure_random, async); 
  require('./test').foo(app, pg); 

  app.get('/', function(req, res){

    var collection = db.collection('documents');

    var documents = mySocket.getDocuments();

    var users = {};
    for (key in documents) {
      users[key] = documents[key][2];
    }

    collection.find({}).toArray(function(err, docs) {
      res.end(swig.renderFile(__dirname + "/index.html", {
        username: JSON.stringify(req.user),
        documents: docs,
        users: users
      }));
    }); 
  });

  app.get('/docs/view', loggedIn, function(req, res){
    console.log("req.user: " + JSON.stringify(req.user));


    res.end(swig.renderFile(__dirname + "/page.html", {
      username: JSON.stringify(req.user)
    })); 
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

  app.get('/test', function(req, res) {
    client.get('cur:doc', function(err, reply) {
      try {
        res.type('json');
        res.end( JSON.stringify(JSON.parse(reply)['users']) || "{}")
      }
      catch (err) {
        res.end(reply);
      }
    });
  });

  app.get('/reset', function(req, res) {
    client.set('cur:doc', '');
    res.end();
  });
  

  app.get('/errors', function(req, res) {
    
    var collection = db.collection('errors');

    var aggregate = false;

    var find = {}, group = {};

    if (req.query.keys) {
      aggregate = true;
      console.log("ag");

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

  http.listen(80, function(){
    console.log('listening on *:80');
  });


  callback(null, "success");
}





async.waterfall([

    function (callback) {
      MongoClient.connect('mongodb://localhost:27017/test', function(err, db_) {

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


