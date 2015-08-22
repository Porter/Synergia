
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
  foo: function (app, channels, db, secure_random, async, swig, BSON, mySocket, notifier) {

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



    app.get('/createDocument', loggedIn, function(req, res) {

      var name = req.query.name;
      var personal = req.query.personal == "true";
      console.log(personal, req.query.personal);

      if (name == undefined || name == '') {
        res.end("-1");
        return;
      }

      var documentsCollection = db.collection('documents');
      documentsCollection.insert(
        {
          struct: '<div id="testArea" class="main" tabindex="-1" contenteditable="true"></div>', 
          val: "",
          creator: req.user,
          name: name,
          personal: personal,
          user: {},
          createdOn: new Date(),
          lastModified: new Date()
        },
        function(err, reply) {
          if (err) stats.error(err, "creating document")
          console.log('created document');
          console.log(reply);
          res.end(reply.ops[0]._id.toString())
      });

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

                  ("write success");
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

        if (!reply || !reply.img) { res.redirect("http://virtualpiano.net/wp-content/plugins/all-in-one-seo-pack/images/default-user-image.png"); return; }

        res.end(reply.img.buffer, 'binary');
      });
    });

    app.get('/getDocuments', loggedIn, function(req, res){

      var g = db.collection('g');
      var friends = g.findOne({_id:BSON.ObjectID(req.user)}, {friends:1}, function(err, usr) {

        usr = usr || {};

        var friends = usr.friends || {};
        friends = Object.keys(friends);
        friends.push(req.user);


        var collection = db.collection('documents');
        collection.find({creator:{'$in':friends}, personal: false}, {name:1, creator:1, lastModified:1}).toArray(function(err, docs) {
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
          res.end(JSON.stringify({documents: docs, user: req.user}));
        }); 
      });
    });

    app.get('/api/friends/get', loggedIn, function(req, res) {
      var people = db.collection('g');

      var user = req.query.user || req.user;

      res.setHeader('content-type', 'text/json');
      people.findOne({_id:BSON.ObjectID(user)}, {friends:1}, function(err, reply) {

        reply = reply || {};
        reply = reply.friends || {};

        var friends = [];
        for (var r in reply) {
          friends.push(BSON.ObjectID(r));
        }

        people.find({_id:{'$in':friends}}, {user:1}).toArray(function (err, replies) {
          res.end(JSON.stringify(replies));
        });
      });
    });

    app.get('/searchPeople', function(req, res) {
      var query = req.query.query;

      var people = db.collection('g');

      res.setHeader('content-type', 'text/json');

      var regex =  query;

      people.find( {user : { '$regex' : regex}}).toArray(function (err, users) {
        res.end(JSON.stringify(users));
      });
    });

    app.get('/befriend', loggedIn, function (req, res) {
      var people = db.collection('g');

      var toSet = {};
      toSet['friends.' + req.query.user] = true;

      people.update({_id:BSON.ObjectID(req.user)}, {'$set': toSet}, {upsert: true}, function(err, reply) {
        res.redirect('/profile?user=' + req.query.user);
      });
    });

    app.get('/api/user/info', function(req, res) {
      var ppl = db.collection('g');

      var user = req.user;

      if (!user) {
        res.setHeader('content-type', 'text/json');
        res.end('{}');
        return;
      }

      ppl.findOne({_id:BSON.ObjectId(user)}, {user:1}, function(err, reply) {
        if (err) console.log(err);
        if (reply) {
          res.setHeader('content-type', 'text/json');
          res.end(JSON.stringify(reply));
        }
        else res.end(req.user + " not found");

      });
    });


    app.get('/getUsersDocuments', function(req, res){

      var collection = db.collection('documents');

      var user = req.query.user || req.user;
      if (!user) {
        res.end('[]');
      }

      var query = {creator:user};
      var personal = req.query.personal;

      console.log('personal', personal);

      if (personal) query.personal = true;

      collection.find(query, {_id:1, name:1}).toArray(function(err, docs) {
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

    app.get('/api/doc/info/get', loggedIn, function(req, res) {
      res.setHeader('content-type', 'text/json');

      var id = req.query.id;
      if (!id) { res.end('[]'); return; }

      var usrs = db.collection('g');
      var docs = db.collection('documents');

      async.parallel([

        function(callback) {
          usrs.findOne({_id:BSON.ObjectID(req.user)}, {user:1}, function(err, reply){ 
            callback(null, reply.user);
          });
        },

        function(callback) {
          docs.findOne({_id:BSON.ObjectID(id)}, {user:1}, function(err, reply){ 
            callback(null, reply.user);
          });
        }

        ],
        function(err, results) {

          if (!results[1][req.user]) {
            res.end('');
            return;
          }

          res.end(JSON.stringify({userId: req.user, username: results[0], color: results[1][req.user].color}));
        });
      
    });

    app.get('/api/user/colors/get', function(req, res) {
      res.setHeader('content-type', 'text/json');

      var usrs = db.collection('g');

      var user = req.query.user || req.user;
      usrs.findOne({_id:BSON.ObjectID(user)}, {colors:1}, function(err, reply) {
        colors = reply.colors || [{}, {}, {}, {}, {}];

        res.end(JSON.stringify(colors));
      });
    });

    app.post('/api/user/colors/update', function(req, res) {
      
      var usrs = db.collection('g');

      res.writeHead(200, {'content-type': 'text/plain'});

      usrs.update({_id:BSON.ObjectID(req.user)}, {'$set':{colors:req.body.colors}}, function(err, reply) {
        if (err) res.end(err);
        else res.end("");
      });
    });


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


    app.get('/api/docs/css/get', function(req, res) {
      res.setHeader('content-type', 'text/css');

      var doc = req.query.doc;

      var docs = db.collection('documents');
      var usrs = db.collection('g');

      docs.findOne({_id:BSON.ObjectID(doc)}, {user:1}, function(err, docReply) {
        if (!docReply && !docReply.user) { res.end(""); return; }

        var userIds = Object.keys(docReply.user);
        var BSONUserIds = userIds.map(function(key) { return BSON.ObjectID(key); });

        usrs.find({_id:{'$in':BSONUserIds}}, {colors:1}).toArray(function(err, replies) {
          var str = "";

          for (var i = 0; i < replies.length; i++) {
            var css = "";
            var reply = replies[i];
            var id = reply._id;

            var className = docReply.user[id].color;

            if (!reply.colors) {
              reply.colors = [{}];
            }

            css += ".u" + className + "{font-family:" + reply.colors[0].font +  "; color: " + reply.colors[0].color + ";}";

            str += css + "\n";
          }

          res.end(str);

        });

      });

    });

    app.post('/api/docs/invite', function(req, res) {
      notifier.invite(req, res);
    });

  }
}
