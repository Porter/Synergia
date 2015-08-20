
var editCycle = 100;

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

  var data = {_id: user, cursor: cursor, classId: doc[3][user].color};
  doc[4][user] = data;

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

      documentsCollection.update( { _id : new BSON.ObjectID(id)}, { '$set': {
        struct: doc[0].documentElement.getElementsByTagName("body")[0].innerHTML,
        val: doc[1], 
        user: doc[3],
        lastModified: new Date()
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
          user: {},
          createdOn: new Date()
        },
        function(err, reply) {
          if (err) stats.error(err, "creating document")
          console.log('created document');
          console.log(reply);
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
        connected--;
        if (socket.isGhost) return;

        console.log(socket.request.user  + ' disconnected');

        if (socket.doc) {
          if (documents[socket.doc]) {
            var users = documents[socket.doc][2];

            var user = users[socket.request.user];
            if (user['x'] <= 1) {
              delete users[socket.request.user];

              var usrs = db.collection('g');

              var str = 'lastVisited.' + socket.doc;
              var toSet = {};
              toSet[str] = {date: new Date(), name: documents[socket.doc][5], id:socket.doc, edited: socket.docEdited == true}; // == true to prevent undefined being stored

              usrs.update(
                {_id: BSON.ObjectID(socket.request.user) },
                {'$set':toSet},
                {upsert:true},
                function(err, reply) {
                  if (err) throw err;
                });
            }
            else {
              user['x']--;
            }

            socket.broadcast.to(socket.doc).emit("users", [socket.request.user, users[socket.request.user]] );
          }
        }

        socket.doc = undefined;
        
        connected--;

      });

      socket.on('updateRecieved', function (msg) { confirm(socket, msg)} );
      

      socket.on('inp', function(msg) {
        //console.log("got msg" + msg + " from user " + socket.request.user);
        if (socket.doc) {
          var doc = socket.doc;
          documentChanger.emit(doc, [socket, {msg:msg, documentId:doc}]);
        }
      });

      socket.on('inp_cur', function(msg) {
        msg = JSON.parse(msg);
        if (socket.doc) {
          var doc = socket.doc;
          //console.log("got msg" + msg[0] + " from user " + socket.request.user);
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

      socket.on('visibilitychange', function(msg) {

        var doc = documents[socket.doc];

        if (!doc || !doc[2][socket.request.user]) {
          console.log("visibilitychanged, but either the doc or the user isn't initialized".red);
        }

        var user = doc[2][socket.request.user];

        user['visibility'] = msg;

        socket.broadcast.to(socket.doc).emit('users', [socket.request.user, user]);
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
        var u = socket.handshake.headers.referer;

        socket.isGhost = u.indexOf('/np?') > -1;
        console.log(socket.isGhost);

        socket.doc = msg;
        socket.joinedDoc = new Date();

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

    function init(msg, channelsCallback) {
      console.log('initing ' + msg[0].request.user);
      var socket = msg[0];
      var documentId = msg[1];

      async.series([

        function(callback) {


          if (!documents[documentId]) { // if it's not loaded 
            
            var collection = db.collection('documents');
            collection.findOne( { _id:new BSON.ObjectID(documentId) }, function(err, doc) { // load it from mongodb

              if (err) {
                stats.error(err, "finding a document", documentId);
                callback(err);
                return;
              }
              

              var structure, text, users, userColors;
              if (doc) {
                console.log("loaded doc for first time");
                var structure = jsdom.jsdom(doc.struct);
                var text = doc.val;
                var currentUsers = {};
                var name = doc.name;
                var id = doc._id;
                var userColors = doc.user;

                var edits = {edits:[], start:0};

                var keys = Object.keys(userColors);
                keys = keys.map(function (key) { return new BSON.ObjectID(key); });

                keys.push(new BSON.ObjectID(socket.request.user));

                var userCollection = db.collection('g');
                userCollection.find({_id : {'$in': keys}}, {_id:1, displayName:1, user:1}).toArray(function (e, replies) {

                  var userLookup = {};

                  for (var i = 0; i<replies.length; i++) { 
                    var reply = replies[i];

                    if (reply['user'] && reply['user'].indexOf(':') != -1) { reply['user'] = reply['user'].substring(3); }

                    userLookup[reply['_id']] = {'displayName':reply['displayName'], 'user':reply['user']}
                  }

                  console.log('initial userLookup is :' + JSON.stringify(userLookup));

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
              console.log(socket.request.user + " doesn't exist in userLookup");
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

                console.log("setting " + socket.request.user + " to " + JSON.stringify(reply));
                doc[7][socket.request.user] = reply;

                var msg = {}
                msg[reply['_id']] = {'displayName':reply['displayName'], 'user':reply['user']};

                socket.broadcast.to(documentId).emit('NewUserJoined', msg);

                callback();

              });
            }
            else { console.log(socket.request.user + " already exists in userLookup: " + JSON.stringify(doc[7][socket.request.user])); callback(); }
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
          
          var color = '';
          if (!socket.isGhost) {

            var userColors = doc[3];
            if (userColors[socket.request.user]) {
              var u = socket.request.user;
              color = 'u' + userColors[u]['color'];
            }
            else {
              var len = Object.keys(userColors).length;
              color = 'u' + len;

              userColors[socket.request.user] = {color : len};

            }


            var userInfo = doc[2][socket.request.user];
            if (!userInfo) {
              uc = {color: color, lastConfirmedEdit:-1, x:1, joined: new Date(), visibility: true};
              // color of color, only logged in from one browser/tab, joined now, is active
              
              doc[2][socket.request.user] = uc;
            } 
            else {
              userInfo['x']++;
            }
          }

          var d= {};
          d["struct"] = doc[0].documentElement.getElementsByTagName("body")[0].innerHTML;
          d["text"] = doc[1];
          
          if (!socket.isGhost) {
            d["color"] = color;
            d["colorId"] = doc[3][socket.request.user].color;
          }

          d["cursor"] = doc[4];
          d["currentUsers"] = doc[2];
          d["title"] = doc[5];
          d["userLookup"] = doc[7];
          d["start"] = doc[8]['start'];

          d["userId"] = socket.request.user;

          if (!socket.isGhost) {
            socket.broadcast.to(documentId).emit('users', [socket.request.user, doc[2][socket.request.user]] );
          }
          socket.emit('init', JSON.stringify(d) );
          

          
          console.log('done initing ' + msg[0].request.user);
          channelsCallback();
        }
      );
    }

    function smallestEdit(arr) {
      if (arr.length == 0) return;
      var high = arr[0], low = arr[0];
      for (var i = 1; i < arr.length; i++) {

        var p = arr[i];

        if (p > high) high = p;
        if (p < low) low = p;
      }

      if (low == -1) return low;
      if (high - low > editCycle/2) { return high; }
      else { return low; }
    }


    function confirm(socket, msg) {
      if (socket.isGhost) return;


      var doc = documents[socket.doc];

      var usersOnDoc = Object.keys(doc[2]);
      var poses = {};
      for (var i = 0; i < usersOnDoc.length; i++) {
        poses[usersOnDoc[i]] = doc[2][usersOnDoc[i]]['lastConfirmedEdit'];
      }


      doc[2][socket.request.user]['lastConfirmedEdit'] = msg[1];

      var jk = usersOnDoc.map(function(user) { return doc[2][user]['lastConfirmedEdit']; });
      var smallest = smallestEdit(jk);


      var diff = doc[8]['start'] - smallest;
      if (smallest == -1) diff = doc[8]['edits'].length; // if smallest is -1, that means there is some user that hasn't confirmed any edits yet


      if (diff < 0) diff += editCycle;


      if (diff >= 0) {
        while (doc[8]['edits'].length > diff) {
          doc[8]['edits'].shift();
        }
      }
      else {
        notifier.sendEmail('pmh192@gmail.com', 'diff is less than 0', ""+diff);
      }

    }

    function changeDocument(msg, callback) {

      var socket = msg[0];
      if (socket.isGhost) {
        callback();
        return;
      }

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

      socket.docEdited = true;

      var changes = JSON.parse(msg);

      var doc = documents[documentId];


      var col = '#ff00ff';//colors[ doc[3][socket.request.user]['color']%colors.length ];
      changejs.setDocument(doc[0].parentWindow.window.document);
      //changejs.setColor(col);

      var serverStart = doc[8]['start'], clientStart = changes[2];
      if (serverStart != clientStart) {
        console.log("server: " + serverStart + "; client: " + clientStart);

        var diff = serverStart - clientStart;
        if (diff < 0) diff += editCycle;

        var edits = doc[8]['edits'];
        if (diff > edits.length) {
          console.log("we don't have enough stored edits".red);
          console.log(doc[8]['edits']);
          console.log(diff);
        }
        else {
          console.log(edits);
          msg = JSON.parse(msg);
          for (var i = edits.length - diff; i < edits.length; i++) {
            console.log("applying edit", edits[i][1]);
            changejs.applyOffsets(edits[i][1], changes[1]);
          }
          msg[1] = changes[1];
          msg = JSON.stringify(msg);
        }
      }

      doc[8]['start'] = (doc[8]['start']+1)%editCycle;
      doc[8]['edits'].push(changes);

      var oldText = doc[1];
      doc[1] = changejs.applyTextChanges(doc[1], changes[1]);

      var colId = "u" + doc[3][socket.request.user].color;

      changejs.applyTextChangesToStructure(doc[0].parentWindow.window.document.getElementById('testArea'), oldText, changes[1], col, colId, doc[1]);
      changejs.form2(doc[0].parentWindow.window.document.getElementById('testArea'), col, colId, true);
      changejs.form(doc[0].parentWindow.window.document.getElementById('testArea'));


      //console.log("applying " + JSON.stringify(changes[1]) + " to " + documents[documentId][1]);
      
      //console.log("gets us: " + documents[documentId][1]);

      var outerHTML = doc[0].parentWindow.window.document.getElementById('testArea').outerHTML;
      var thing = [msg, outerHTML, doc[1], doc[8]['start'], col, colId ];

      socket.emit('resp', JSON.stringify(thing), function (msg) { confirm(socket, msg)} );
      socket.broadcast.to(socket.doc).emit('update', JSON.stringify(thing));

      saveDocument(db, documentId, documents[documentId], null);

      
      if (cursorChange) { changeCursor(documentId, user, cursorChange, socket, callback); return; }
      else callback();
    }


    var documentChanger = new channels.channels(changeDocument);

    var initer = new channels.channels(init);
  }
}
