console.log('---------------------------------------------------------');
console.log('here we go');
console.log('---------------------------------------------------------');


var util = require('./js/util');

var environment = util.getEnvironment();

var mode = environment.mode;
var email = environment.email; // {email:the_email, password:thePassword}

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
var secure_random = require('secure-random');

var mongo = require('mongodb'),
  MongoClient = mongo.MongoClient,
  BSON = mongo.ObjectID;

var url = require('url');
var redis = require("redis");


winston.add(winston.transports.File, { filename: 'logs.log' });
winston.remove(winston.transports.Console);

var async = require('async');

var secretKey = 'keyboard cat';
app.use(cookieParser(secretKey));

app.use('/public', express.static(__dirname + '/public'));

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.set('port', (process.env.PORT || 80));


function connectToRedis(callback) {
  console.log("connecting to redis...");
  var client;
  if (mode == 'production') {
    var redisURL = url.parse(process.env.REDIS_URL);
    var client = redis.createClient(redisURL.port, redisURL.hostname);
    client.auth(redisURL.auth.split(":")[1]);
  }
  else {
    client = redis.createClient();
  }
  client.on("connect", function() {
    console.log("connected to redis");
    callback(null, {client:client});
  });
  client.on("error", function(err) {
    console.log("error connecting to redis");
    callback(err, null);
  });
}

function connectToMongo(dependencies, callback) {
  var uri = mode == 'production' ? 'mongodb://porter:'+process.env.My_MongoLab_Password+'@ds027483.mongolab.com:27483/heroku_tw7tpcwn' : 'mongodb://localhost:27017/test';

  console.log("connecting to mongo with uri " + uri);
  MongoClient.connect(uri, function(err, db) {

    if (err){
      return callback(err, null);
    }

    if (!db) {
      console.log("db is null".red);
    }
    
    dependencies.db = db;

    console.log("connected to mongo");
    callback(null, dependencies);
  });
}


function runServer(dependencies, callback) {

  var db = dependencies.db;
  var client = dependencies.client;

  var sessionStore = new RedisStore({client: client});
  app.use(session({ 
      secret: secretKey,
      key: 'app.sid', 
      resave: true,
      saveUninitialized: true,
      store: sessionStore
  }));

  app.use(passport.initialize());   // passport initialize middleware
  app.use(passport.session());      // passport session middleware 

  dependencies = {
    email: email,
    secure_random: secure_random,
    db:db,
    app:app,
    inProduction: mode=='production',
    passport:passport,
    LocalStrategy:LocalStrategy,
    passportSocketIo:passportSocketIo,
    io:io,
    secretKey:secretKey,
    sessionStore:sessionStore,
    channels:channels,
    changejs:changejs,
    jsdom:jsdom,
    winston:winston,
    mongo:mongo,
    db:db,
    async:async,
    swig:swig,
    BSON:BSON,
    pg:pg,
    express:express,
    fs:fs
  };

  var notifier = require('./js/notify');
  notifier.init(dependencies);

  var stats = require('./js/stats');
  stats.init(dependencies);

  require('./js/auth').foo(dependencies, notifier);
  
  var mySocket = require('./js/socket');
  mySocket.foo(dependencies, stats, notifier);

  require('./js/api').foo(dependencies, mySocket, notifier); 
  require('./js/test').foo(dependencies); 

  require('./js/errors').foo(dependencies, stats);

  require('./js/fileServer').foo(dependencies);


  http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port'));
  });


  callback(null, "success");
}


async.waterfall([
    connectToRedis,
    connectToMongo,
    runServer
  ],
  function (err, results) {
    console.log("results: " + results);
  }
);


