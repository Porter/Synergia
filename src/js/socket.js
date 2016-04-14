
var cycleLen = 1000;

function getBody(documentEl) {
  return documentEl.getElementsByTagName("body")[0];
}

function arrContains(arr, obj) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == obj)  return true;
  }
  return false;
}

var change = require('./change');
var util = require('./../public/js/util');


function changeCursor(documentId, user, cursor, socket, callback) {
  var doc = documents[documentId];

  var data = {_id: user, cursor: cursor, classId: doc[3][user].color};
  doc[4][user] = data;

  socket.broadcast.to(documentId).emit('cur', data);

  callback();
}

var documents = {};

module.exports = {
  getDocuments: function() { return documents; },

  foo: function (dependencies, stats, notifier) {

    var io = dependencies.io;
    var passportSocketIo = dependencies.passportSocketIo; 
    var secretKey = dependencies.secretKey;
    var sessionStore = dependencies.sessionStore;
    var channels = dependencies.channels;
    var changejs = dependencies.changejs;
    var jsdom = dependencies.jsdom;
    var winston = dependencies.winston;
    var mongo = dependencies.mongo;
    var db = dependencies.db;
    var secure_random = dependencies.secure_random;
    var async = dependencies.async;

    var BSON = mongo.ObjectID;

    function saveDocument(db, id, doc, callback) {
      var documentsCollection = db.collection('documents');

      documentsCollection.update( 
        { _id : new BSON.ObjectID(id)},
         { '$set': {
          text: doc.text, 
          colors: doc.colors,
          users: doc.users,
          lastModified: new Date()
          }
        },
        callback
        );
    }

    function updateUser(status, documentId, documentName, user) {
      var usrs = db.collection('g');

      var str = 'lastVisited.' + documentId;
      var toSet = {};
      toSet[str] = {
        date: new Date(), 
        name: documentName, 
        id:documentId, 
        status: status
      };

      usrs.update(
        {_id: BSON.ObjectID(user) },
        {'$set':toSet},
        {upsert:true},
        function(err, reply) {
          if (err) throw err;
        });
    }

    function getUserLookup(colors, callback) {
      console.log('getting userLookup');
      console.log(JSON.stringify(colors));
      var usersCollection = db.collection('g'), userLookup = {};

      var usersInColors = {};
      for (var i = 0; i < colors.length; i++) {
        usersInColors[colors[i][1]] = 1;
      }
      console.log(JSON.stringify(usersInColors));

      async.forEachOf(usersInColors, 
        function(value, key, callback) {
          console.log(key);

          usersCollection.findOne({_id:BSON(key)}, {colors:1}, function(err, colors) {
            if (!colors || !colors.colors) userLookup[key] = [{color:'black'}];
            else userLookup[key] = colors;

            callback(err, null);
          });

        },
        function (err) {
          if (err) console.error(err);

          console.log('got userLookup', JSON.stringify(userLookup));
          callback(err, userLookup);
        }
      );
    }



    io.set("authorization", passportSocketIo.authorize({
      key:    'app.sid', 
      secret:  secretKey,
      store:   sessionStore,     
      fail: function(data, message, error, accept) {
      	console.log("data:   " + "");
      	console.log("message: " + message);
      	console.log("error:   " + JSON.stringify(error));
        stats.error(error, "passportSocketIo auth");
      	accept(null, true);
      },
      success: function(data, accept) {
          accept(null, true);
      }
    }));

    colors = ['#888888', '#ff0000', '#008a00', '#0000ff', '#000000', '#aaaa00', '#ff00ff', '#00ffff'];
    var connected = 0;

    io.on('connection', function(socket){

      var document;


      if (typeof(socket.request.user) != "string") { // user isn't logged in
        return;
      }

      connected++;
      console.log(socket.request.user + ' connected as user #' + connected);


      socket.on('disconnect', function(){
        if (socket.isGhost) return;

        console.log(socket.request.user  + ' disconnected');

        if (socket.doc) {
          if (documents[socket.doc]) {
            var doc = documents[socket.doc];

            var users = doc.users;
            console.log(JSON.stringify(users));
            var user = users[socket.request.user];

            if (user['x'] <= 1) {
              delete users[socket.request.user];

              if (socket.docEdited) { updateUser("edited", socket.doc, doc[5], socket.request.user); }
              else {
                if (socket.isNewDocument) { updateUser("created", socket.doc, doc[5], socket.request.user); }
                else { updateUser("viewed", socket.doc, doc[5], socket.request.user); }
              }
            }
            else {
              user['x']--;
            }

            console.log(JSON.stringify(users));

            if (Object.keys(users).length == 0) {
              saveDocument(db, socket.doc, doc);
            }
            else {
              socket.broadcast.to(socket.doc).emit("users", [socket.request.user, users[socket.request.user]] );
            }
          }
        }

        socket.doc = undefined;
        
        connected--;

      });

      socket.on('cur', function(msg) {
        msg = JSON.parse(msg);
        if (socket.doc) {
          var doc = socket.doc;
        }
      });

      socket.on('visibilitychange', function(msg) {

        return;

        var doc = documents[socket.doc];

        if (!doc || !doc.users[socket.request.user]) {
          console.log("visibilitychanged, but either the doc or the user isn't initialized".red);
        }

        var user = doc.users[socket.request.user];

        user['visibility'] = msg;

        socket.broadcast.to(socket.doc).emit('users', [socket.request.user, user]);
      });

      socket.on('init', function(msg){
        socket.join(msg);
        var u = socket.handshake.headers.referer;

        var user = socket.request.user;

        socket.isGhost = u.indexOf('/np?') > -1;
        console.log(socket.isGhost);

        socket.doc = msg;
        socket.joinedDoc = new Date();

        var document = documents[msg];
        if (document) {
          if (document.users[user]) {
            document.users[user].x++;
          }
          else {
            document.users[user] = {x:1, visibility:true};
          }

          var userCollection = db.collection('g');
          userCollection.findOne({_id:BSON(user)}, {colors:1}, function(err, colors) {
            document.userLookup[user] = colors;

            io.to(msg).emit('newUserJoined', {user: colors})
            socket.emit('init', {userId:user, doc:document});
          });

        }
        else {
          async.waterfall(
          [
            function (callback) {
              var documentsCollection = db.collection('documents');
              documentsCollection.findOne({_id:BSON(msg)}, callback);
            },
            function (reply, callback) {
              var userCollection = db.collection('g');
              userCollection.findOne({_id:BSON(user)}, {colors:1}, function(err, colors) {
                callback(err, reply, colors);
              });
            },
            function(reply, userColors, callback) {
              getUserLookup(reply.colors || [], function(err, userLookup) {
                callback(err, reply, userColors, userLookup);
              });
            },
            function (reply, userColors, userLookup, callback) {
              document = reply;
              if (document) {

                // init the document
                document.users = {};
                document.users[user] = {x:1, visibility:true}

                document.cursor = {};
                document.userLookup = userLookup;
                document.userLookup[user] = userColors;

                document.number = 0;
                document.edits = {};

                callback(null, document);
              }
              else {
                callback(new Error("document for " + msg + " is null"), null);
              }
            }
          ],
          function(err, document) {
            if (err) console.log(err);
            else {
              documents[msg] = document;
              socket.emit('init', {userId:socket.request.user, doc:documents[msg]});
            }


          });
        }
      });

      function findClientsSocket(roomId, namespace) {
        var res = [], ns = io.of(namespace ||"/");    // the default namespace is "/"

        if (ns) {
          for (var id in ns.connected) {
              if(roomId) {
                  var index = ns.connected[id].rooms.indexOf(roomId) ;
                  if(index !== -1) {
                      res.push(ns.connected[id]);
                  }
              } else {
                res.push(ns.connected[id]);
            }
          }
        }
        return res;
      }


      function cleanUpEdits(clients, edits) {
        var clients = findClientsSocket();
        
        if (clients.length == 0) {
          edits = {};
          return;
        }

        var lowest = clients[0].lastEdit;
        if (lowest == undefined) return;

        for (var i = 1; i < clients.length; i++) {

          var differenceForward = clients[i].lastEdit - lowest;
          var differenceBackward = -differenceForward;

          while (differenceForward < 0) differenceForward += cycleLen/2;
          while (differenceBackward < 0) differenceBackward += cycleLen/2;

          if (differenceForward > differenceBackward) {
            lowest = clients[i].lastEdit;
          }
        }

        var r = lowest;

        for (var i = 0; i < cycleLen/2; i++) {
          lowest--;
          if (lowest < 0) lowest += cycleLen;

          edits[lowest] = undefined;
        }

        return ((r-1) + cycleLen) % cycleLen;

      }

      socket.on('input', function(input) {
        var c = input['change'];
        var n = input['number'];

        var edit = change.stringToEditPath(c);
        var user = socket.request.user;
        
        var document = documents[socket.doc];

        var number = document.number;
        var edits = document.edits;
        var text = document.text || "";

        var colors = document.colors || [];
        document.colors = colors;

        //console.log(n + ", " + number + ": " + text);
        console.log("got edit", n, "at", number, JSON.stringify(edit));

        var originalEdit = util.copyEdit(edit);

        if (n != number) {
          for (var i = n; i != number; i = (i+1)%cycleLen) {
            util.applyOffsets(edit, edits[i]);
            console.log('applying', JSON.stringify(edits[i]));
            console.log('new edit', JSON.stringify(edit));
          }
        }

        var offsetDepth = Math.abs(number - n);
        if (offsetDepth > cycleLen/2) offsetDepth = cycleLen - offsetDepth;

        
        console.log(text + " -> " + change.applyEditPath(text, edit));
        text = change.applyEditPath(text, edit);
        change.applyEditPathToColors(colors, edit, user);

        edits[number] = originalEdit;
        var lowest = cleanUpEdits(null, edits);
        console.log('lowest: ' + lowest);

        number = (number + 1) % cycleLen;

        var hash = change.hashString(text);

        io.in(socket.doc).emit('editConfirmed', {user:user, number:number, offsetDepth:offsetDepth, edit:originalEdit, hash:hash, text:text, lowest:lowest});

        document.number = number;
        document.text = text;
      });

      socket.on('editConfirmationRecieved', function(data) {
        socket.lastEdit = data.number;
        cleanUpEdits(null, documents[socket.doc].edits);
      });

      socket.on('rename', function (msg) {
        var id = documents[socket.doc][6];

        var documentsCollection = db.collection('documents');
        documents[socket.doc][5] = msg;
        documentsCollection.update( { _id: id }, { '$set': {name: msg} }, function(err, reply) {
          if (err) {
            stats.error(err, "renaming document", msg);
          }
        });

      });

      socket.on('notify', function(msg) {

        var ids = msg[0];
        var emails = msg[1];

        console.log(emails);

        var collection = db.collection('g');

        ids = ids.map(function (id) { return BSON.ObjectID(id); });
        collection.find( { _id: {'$in':ids} }, {email:1, user:1} ).toArray(function(err, replies) {
          replies.forEach(function (reply) {
            console.log(reply.email);

            notifier.send(reply.email, socket.doc, documents[socket.doc]);

          });
        });
        console.log('http://localhost/docs/view?doc=' + socket.doc);
      });

      socket.on('clientError', function (msg) {
        console.log("**********CLIENT ERROR************".red)
        var collection = db.collection('clientErrors');
        collection.insert(JSON.parse(msg));
      });

      socket.on('error', function(error) {
        stats.error(error, "uncaught error");

        console.log(error);
        console.log(error.stack);
      });

    }); // socket on connection
  }
}
