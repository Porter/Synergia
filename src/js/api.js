
var formidable = require('formidable'),
    util = require('util'),
    fs   = require('fs-extra'),
    qt   = require('quickthumb');

var MongoClient = require('mongodb').MongoClient,
  Grid = require('mongodb').Grid;

function loggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
}

module.exports = {
  foo: function (app, channels, db, secure_random, async, swig, BSON, mySocket) {

    app.get("/docs/new", function (req, res) {

      var name = req.param('name');

      var user = req.user;

      if (name && user) {
        var collections = db.collection('documents');


        var data = { name : name, creator : user, struct : '<div id="testArea" class="main" tabindex="-1" contenteditable="true"></div>', val : 0};
        collections.insert(data, function(err, reply) {
          res.end(reply.ops[0]._id.toString());
        });


      }
      else if (!user) {
        res.redirect("/login");
      }
      else {
        res.end("give me some params you idiot");
      }
    });


    app.get("/profilef", function(req, res) {

      var user = req.query.user || req.user;

      if (!user) { res.end("no name given"); return; }

      res.end(user);

    });    


    app.post('/upload', function (req, res){
      var form = new formidable.IncomingForm(),
        files = [],
        fields = [];


      form
        .on('field', function(field, value) {
          fields.push([field, value]);
        })
        .on('file', function(field, file) {
          files.push([field, file]);
        })
        .on('end', function() {
          res.writeHead(200, {'content-type': 'text/plain'});

          var temp_path = this.openedFiles[0].path;

          var file_name = this.openedFiles[0].name;

          var new_location = 'uploads/';

          fs.readFile(temp_path, function (err, data) {
              if (err) throw err;
              console.log(data.length);

              var c = db.collection('imgs');

              c.update(
                {user:req.user},
                {'$set':{img:data}},
                {upsert:true},
                function(err, reply) {
                  if (err) throw err;

                  console.log("write success");
              });
          });

          res.end("'");

        });
      form.parse(req);


    });


    app.get('/imgs', function(req, res) {
      var c = db.collection('imgs');

      c.findOne({user:req.query.user}, function(err, reply) {
        if (err) throw err;

        if (!reply || !reply.img) { res.status(404).send("Not found"); return; }

        res.end(reply.img.buffer, 'binary');
      });
    });

    app.get('/getDocuments', loggedIn, function(req, res){

      console.log(req.user);
      var g = db.collection('g');
      var friends = g.findOne({_id:BSON.ObjectID(req.user)}, {friends:1}, function(err, usr) {

        usr = usr || {};

        var friends = usr.friends || [];
        friends.push(req.user);

        
        console.log(friends);

        var collection = db.collection('documents');
        collection.find({creator:{'$in':friends}}).toArray(function(err, docs) {
          if (err) throw err;

          // var keys = Object.keys(docs);

          // var g = db.collection('g');

          // var querys = keys.map(function(key) { 
          //   var str = "lastVisited." + docs[key]._id.toString();
          //   var t = {};
          //   t[str] = {'$exists':true};
          //   return t;
          // });

          res.setHeader('content-type', 'text/json');
          res.end(JSON.stringify(docs));
        }); 
      });
    });

    app.get('/myFriends', loggedIn, function(req, res) {
      var friends = db.collection('g');

      friends.findOne({_id:BSON.ObjectID(req.user)}, {friends:1}, function(err, reply) {

        res.setHeader('content-type', 'text/json');
        res.end(JSON.stringify(reply.friends));
      });
    });

    app.get('/searchFriends', function(req, res) {
      var query = req.query.query;

      var people = db.collection('g');

      res.setHeader('content-type', 'text/json');

      var regex =  query;

      people.find( {user : { '$regex' : regex}}).toArray(function (err, users) {
        res.end(JSON.stringify(users));
      });


    });


    app.get('/myDocuments', loggedIn, function(req, res){

      var collection = db.collection('documents');

      collection.find({creator:req.user}, {_id:1, name:1}).toArray(function(err, docs) {
        if (err) throw err;

        res.setHeader('content-type', 'text/json');
        res.end(JSON.stringify(docs));
      }); 
    });

    function getEvents(req, callback) {
      var usrs = db.collection('g');

      usrs.find({}, {_id:1}).toArray(function(err, reply) {
        var users = reply.map(function(u) { return u._id });


        usrs.find({'$and': [ {_id:{'$in':users}}, {lastVisited:{'$exists':true}} ]}, {user:1, email: 1, lastVisited:1}).toArray(function (err, replies) {

          callback(replies);

          /*var docs = [];
          for (var i = 0; i < replies.length; i++) {
            docs.push.apply(docs, Object.keys(replies[i].lastVisited));
          }
          docs = docs.map(function(doc) { return BSON.ObjectID(doc); });
          res.write('\n');
          res.write(JSON.stringify(docs));*/

        });
      });
    }


    app.get('/f', function(req, res) {
      getEvents(req, function(results) { res.end(JSON.stringify(results)); } );
    });

    app.get('/aval', function(req, res) {
      var documents = mySocket.getDocuments();

      var users = {};
      for (key in documents) {
        var usersOnDoc = Object.keys(documents[key][2]);
        if (usersOnDoc.length != 0) {
          users[key] = usersOnDoc;
        }
      }

      res.end(JSON.stringify(users));
    });

  }
}
