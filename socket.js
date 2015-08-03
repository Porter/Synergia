function getBody(documentEl) {
  return documentEl.getElementsByTagName("body")[0];
}

function arrContains(arr, obj) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == obj)  return true;
  }
  return false;
}


function changeCursor(documentId, user, cursor, socket, callback) {
  var doc = documents[documentId];

  doc[4][user] = cursor;

  var data = {};
  data[user] = cursor;

  socket.broadcast.to(documentId).emit('cur', data);

  callback();
}

var documents = {};

module.exports = {
  getDocuments: function() { return documents; },

  foo: function (io, passportSocketIo, secretKey, sessionStore, channels, changejs, jsdom, winston, mongo, db, secure_random, async, stats, notifier) {

    var BSON = mongo.ObjectID;

    function saveDocument(db, id, doc, callback) {
      var documentsCollection = db.collection('documents');

      // var doc = [structure, text, users, userColors, {}, name, id, userLookup];
      documentsCollection.update( { _id : new BSON.ObjectID(id)}, { '$set': {
        struct: doc[0].documentElement.getElementsByTagName("body")[0].innerHTML,
        val: doc[1], 
        user: doc[3],

        }
      });
    }


    function createDocument(db, name, user, callback) {
      var documentsCollection = db.collection('documents');
      documentsCollection.insert(
        {
          struct: '<div id="testArea" class="main" tabindex="-1" contenteditable="true"></div>', 
          val: "",
          creator: user,
          name: name,
          user: {}
        },
        function(err, reply) {
          if (err) stats.error(err, "creating document")
          callback(err, reply);
      });
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


      if (typeof(socket.request.user) != "string") { // user isn't logged in
        return;
      }

      connected++;
      console.log(socket.request.user + ' connected as user #' + connected);


      socket.on('disconnect', function(){
        console.log(socket.request.user  + ' disconnected');

        if (socket.doc) {
          if (documents[socket.doc]) {
            var users = documents[socket.doc][2];

            var user = users[socket.request.user];
            if (user['x'] <= 1) {
              console.log("deleting " + socket.request.user, users[socket.request.user]);
              delete users[socket.request.user];
            }
            else {
              console.log("decrementing ", user);
              user['x']--;
            }
            
          }

          socket.broadcast.to(socket.doc).emit("users", JSON.stringify( { removed: socket.request.user } ));
        }

        socket.doc = undefined;
        
        connected--;

      });
      

      socket.on('inp', function(msg) {
        console.log("got msg" + msg + " from user " + socket.request.user);
        if (socket.doc) {
          var doc = socket.doc;
          documentChanger.emit(doc, [socket, {msg:msg, documentId:doc}]);
        }
      });

      socket.on('inp_cur', function(msg) {
        msg = JSON.parse(msg);
        if (socket.doc) {
          var doc = socket.doc;
          console.log("got msg" + msg[0] + " from user " + socket.request.user);
          documentChanger.emit(doc, [socket, {msg:msg[0], documentId:doc, cursor:msg[1]}]);
        }
      });

      socket.on('cur', function(msg) {
        msg = JSON.parse(msg);
        if (socket.doc) {
          var doc = socket.doc;
          documentChanger.emit(doc, [socket, {cursor:msg, documentId:doc}]);
        }
      });


      socket.on('LengthMismatch', function(d) {
        documentChanger.emit(socket.doc, [socket, {
          customFunc:function() {
            console.log("fixing " + documents[socket.doc][1] + " to " + d);
            documents[socket.doc][1] = d;
          }}]
        );
      });


      

      socket.on('createDocument', function(msg, fn) {


        if (typeof msg != "string" || msg == "") {
          fn(-1);
          return;
        }
        createDocument(db, msg, socket.request.user, function(err, reply) { 
          if (err) {
            stats.error(err, "creating document", msg);
            fn(-1);
          }
          else {
            fn(reply.ops[0]._id.toString());
          }

        });
        

      });

      socket.on('init', function(msg){
        socket.join(msg);

        socket.doc = msg;

        initer.emit(msg, [socket, msg]);
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

      socket.on('notify', function(ids) {
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

    function init(msg, channelsCallback) {
      var socket = msg[0];
      var documentId = msg[1];

      async.series([

        function(callback) {


          if (!documents[documentId]) { // if it's not loaded in ram
            
            var collection = db.collection('documents');
            collection.findOne( { _id:new BSON.ObjectID(documentId) }, function(err, doc) { // load it from mongodb

              if (err) {
                stats.error(err, "finding a document", documentId);
                callback(err);
                return;
              }
              

              var structure, text, users, userColors;
              if (doc) {
                var structure = jsdom.jsdom(doc.struct);
                var text = doc.val;
                var currentUsers = {};
                var name = doc.name;
                var id = doc._id;
                var userColors = doc.user;

                var edits = {edits:[], start:0};

                var keys = Object.keys(userColors);
                keys = keys.map(function (key) { return new BSON.ObjectID(key); });


                var userCollection = db.collection('g');
                userCollection.find({_id : {'$in': keys}}, {_id:1, displayName:1, user:1}).toArray(function (e, replies) {

                  var userLookup = {};

                  for (var i = 0; i<replies.length; i++) { 
                    var reply = replies[i];

                    if (reply['user'] && reply['user'].indexOf(':') != -1) { reply['user'] = reply['user'].substring(3); }

                    userLookup[reply['_id']] = {'displayName':reply['displayName'], 'user':reply['user']}
                  }

                  var doc = [structure, text, currentUsers, userColors, {}, name, id, userLookup, edits];
                  documents[documentId] = doc;

                  callback();
                });


              }
              else {
                var e = new Error("document " + documentId + " doesn't exist");
                stats.error(e, "document doesn't exist", documentId)
                callback(e);
                return;
              }
              
              

            }); 
          }
          else {
            var doc = documents[documentId];

            if ( !doc[7][socket.request.user] ) {
              var userCollection = db.collection('g');
              userCollection.findOne( {_id: BSON.ObjectID(socket.request.user) }, {_id:1, displayName:1, user:1}, function(e, reply) {

                if (e) { 
                  console.log(("couldn't find " + socket.request.user).red); 
                  stats.error(e, "getting user", socket.request.user); 
                  callback(e);
                  return;
                }

                if (!reply) {
                  console.log(("couldn't find " + socket.request.user).red); 
                }

                reply['_id'] = reply['_id'].toString();
                if (reply['user'] && reply['user'].indexOf(':') != -1) { reply['user'] = reply['user'].substring(3); }

                doc[7][socket.request.user] = reply;

                var msg = {}
                msg[reply['_id']] = {'displayName':reply['displayName'], 'user':reply['user']};

                socket.broadcast.to(documentId).emit('NewUserJoined', msg);

                callback();

              });
            }
            else { callback(); }
          }
        }],

        function (err, replies) {

          if (err) {
            stats.error(err, "initing");
            socket.emit('init', err.toString());

            channelsCallback();
            return;
          }

          var doc = documents[documentId];

          var userColors = doc[3];
          if (userColors[socket.request.user]) {
            var u = socket.request.user;
            color = colors[ userColors[socket.request.user]['color'] % colors.length];
          }
          else {
            var len = Object.keys(userColors).length;
            color = colors[len%colors.length];

            userColors[socket.request.user] = {color : len%colors.length};

          }

          var d= {};
          d["struct"] = doc[0].documentElement.getElementsByTagName("body")[0].innerHTML;
          d["text"] = doc[1];
          d["color"] = color;
          d["cursor"] = doc[4];
          d["currentUsers"] = doc[2];
          d["title"] = doc[5];
          d["userLookup"] = doc[7];
          d["start"] = doc[8]['start'];


          socket.broadcast.to(documentId).emit('users', JSON.stringify( {added: socket.request.user, user:{color:color, x:1}}  ));
          socket.emit('init', JSON.stringify(d) );

          var userColor = doc[2][socket.request.user];
          if (!userColor) {
            uc = {color: color, x:1}; // color of color, only logged in from one browser/tab
            doc[2][socket.request.user] = uc;
          } 
          else {
            userColor['x']++;
          }

          channelsCallback();
        }
      );
    }
    function changeDocument(msg, callback) {

      var socket = msg[0];
      msg = msg[1];

      if (msg['customFunc']) {
        msg['customFunc']();
        callback();
        return;
      }

      var user = socket.request.user;
      var documentId = msg['documentId'];
      var cursorChange = msg['cursor'];
      msg = msg['msg'];

      if (typeof(user) != "string" || !documents[documentId]) { // user isn't logged in or document isn't inited
        if (typeof(user) != "string") console.log("user isn't logged in");
        if (!documents[documentId]) console.log("documents doesn't have key " + documentId);
        callback();
        return;
      }

      if (!msg) {
        changeCursor(documentId, user, cursorChange, socket, callback);
        return;
      }

      var changes = JSON.parse(msg);

      var doc = documents[documentId];


      var col = colors[ doc[3][socket.request.user]['color']%colors.length ];
      changejs.setDocument(doc[0].parentWindow.window.document);
      //changejs.setColor(col);

      var serverStart = doc[8]['start'], clientStart = changes[3];
      if (serverStart != clientStart) {
        console.log("server: " + serverStart + "; client: " + clientStart);
      }

      doc[8]['start'] = (doc[8]['start']+1)%10;

      var oldText = doc[1];
      doc[1] = changejs.applyTextChanges(doc[1], changes[1]);

      changejs.applyTextChangesToStructure(doc[0].parentWindow.window.document.getElementById('testArea'), oldText, changes[1], col, doc[1]);
      changejs.form2(doc[0].parentWindow.window.document.getElementById('testArea'), col, true);
      changejs.form(doc[0].parentWindow.window.document.getElementById('testArea'));


      //console.log("applying " + JSON.stringify(changes[1]) + " to " + documents[documentId][1]);
      
      //console.log("gets us: " + documents[documentId][1]);

      var outerHTML = doc[0].parentWindow.window.document.getElementById('testArea').outerHTML;
      var thing = [msg, outerHTML, doc[1], doc[8]['start'], col];

      console.log("----------------");
      //console.log("updating " + JSON.stringify(io.nsps['/'].adapter.rooms[socket.doc]));
      console.log("replying to " + socket.request.user, doc[8]['start']);
      console.log(outerHTML);
      console.log("----------------");
      socket.emit('resp', JSON.stringify(thing));
      socket.broadcast.to(socket.doc).emit('update', JSON.stringify(thing));

      saveDocument(db, documentId, documents[documentId], null);

      
      if (cursorChange) { changeCursor(documentId, user, cursorChange, socket, callback); return; }
      else callback();
    }


    var documentChanger = new channels.channels(changeDocument);

    var initer = new channels.channels(init);
  }
}
