function getBody(documentEl) {
  return documentEl.getElementsByTagName("body")[0];
}

function arrContains(arr, obj) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == obj)  return true;
  }
  return false;
}

module.exports = {
  foo: function (io, passportSocketIo, secretKey, sessionStore, redis, redis_client, channels, changejs, jsdom, winston, mongo, db, secure_random, async, stats) {

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

    colors = ['#888888', '#ff0000', '#00ff00', '#0000ff', '#ffffff', '#aaaa00', '#ff00ff', '#00ffff'];
    var connected = 0;


    var documents = {};

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
            delete users[socket.request.user];
          }

          socket.broadcast.to(socket.doc).emit("users", JSON.stringify( { removed: socket.request.user } ));
        }

        socket.doc = undefined;
        
        connected--;

      });

      function changeCursor(documentId, user, cursor, callback) {
        var doc = documents[documentId];

        if (!cursor) {
          callback();
          return
        }

        doc[4][user] = cursor;

        var data = {};
        data[user] = cursor;

        socket.broadcast.to(documentId).emit('cur', data);

        callback();
      }

      function changeDocument(msg, callback) {

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
          changeCursor(documentId, user, cursorChange, callback);
          return;
        }

        var changes = JSON.parse(msg);

        var doc = documents[documentId];


        changejs.setDocument(documents[documentId][0].parentWindow.window.document);
        changejs.setColor(colors[ doc[3][socket.request.user]['color'] ]);

        if (changes[0]) {

          changes[0][1] = changejs.createNodeTree(changes[0][1]);


          changejs.applyStructuralChanges(documents[documentId][0].parentWindow.window.document.getElementById('testArea'), changes[0]);
        }

        console.log("after struct");
        console.log(changejs.strip(documents[documentId][0].parentWindow.window.document.getElementById('testArea')).outerHTML);

        changejs.colorizeStructure(changes[2], documents[documentId][0].parentWindow.window.document.getElementById('testArea'));

        console.log("after color");
        console.log(changejs.strip(documents[documentId][0].parentWindow.window.document.getElementById('testArea')).outerHTML);


        changejs.form(documents[documentId][0].parentWindow.window.document.getElementById('testArea'));

        console.log("after form");
        console.log(changejs.strip(documents[documentId][0].parentWindow.window.document.getElementById('testArea')).outerHTML);
        console.log('------------------------------');


        //console.log("applying " + JSON.stringify(changes[1]) + " to " + documents[documentId][1]);
        documents[documentId][1] = changejs.applyTextChanges(documents[documentId][1], changes[1]);
        //console.log("gets us: " + documents[documentId][1]);


        var thing = [documents[documentId][0].parentWindow.window.document.getElementById('testArea').outerHTML, documents[documentId][1]];

        socket.emit('resp', JSON.stringify(thing));
        socket.broadcast.to(socket.doc).emit('update', JSON.stringify(thing));

        saveDocument(db, documentId, documents[documentId], null);

        
        if (cursorChange) { changeCursor(documentId, user, cursorChange, callback); return; }
        else callback();
      }

      var documentChanger = new channels.channels(changeDocument);


      socket.on('inp', function(msg) {
        console.log("got msg" + msg);
        if (socket.doc) {
          var doc = socket.doc;
          documentChanger.emit(doc, {msg:msg, documentId:doc});
        }
      });

      socket.on('inp_cur', function(msg) {
        msg = JSON.parse(msg);
        if (socket.doc) {
          var doc = socket.doc;
          console.log("got msg" + msg[0]);
          documentChanger.emit(doc, {msg:msg[0], documentId:doc, cursor:msg[1]});
        }
      });

      socket.on('cur', function(msg) {
        msg = JSON.parse(msg);
        if (socket.doc) {
          var doc = socket.doc;
          documentChanger.emit(doc, {cursor:msg, documentId:doc});
        }
      });



      function init(documentId, channelsCallback) {

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


                console.log("found document: " + doc.name);
                

                var structure, text, users, userColors;
                if (doc) {
                  var structure = jsdom.jsdom(doc.struct);
                  var text = doc.val;
                  var currentUsers = {};
                  var name = doc.name;
                  var id = doc._id;
                  var userColors = doc.user;

                  console.log(userColors);
                  var keys = Object.keys(userColors);
                  keys = keys.map(function (key) { return new BSON.ObjectID(key); });


                  var userCollection = db.collection('g');
                  userCollection.find({_id : {'$in': keys}}, {_id:1, displayName:1, user:1}).toArray(function (e, replies) {

                    console.log("replies");

                    var userLookup = {};

                    for (var i = 0; i<replies.length; i++) { 
                      var reply = replies[i];

                      if (reply['user'] && reply['user'].indexOf(':') != -1) { reply['user'] = reply['user'].substring(3); }

                      userLookup[reply['_id']] = {'displayName':reply['displayName'], 'user':reply['user']}
                    }


                    console.log(userLookup);

                    var doc = [structure, text, currentUsers, userColors, {}, name, id, userLookup];
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
              console.log(u + " loading saved color of index " + userColors[u]['color'] + ": " + colors[userColors[u]['color']]);
              color = colors[ userColors[socket.request.user]['color'] ]
            }
            else {
              var len = Object.keys(userColors).length;
              color = colors[len];

              userColors[socket.request.user] = {color : len};

            }

            var d= {};
            d["struct"] = doc[0].documentElement.getElementsByTagName("body")[0].innerHTML;
            d["text"] = doc[1];
            d["color"] = color;
            d["cursor"] = doc[4];
            d["currentUsers"] = doc[2];
            d["title"] = doc[5];
            d["userLookup"] = doc[7];


            socket.broadcast.to(documentId).emit('users', JSON.stringify( {added: socket.request.user, color:color}  ));
            socket.emit('init', JSON.stringify(d) );

            doc[2][socket.request.user] = color;

            channelsCallback();
          }
        );
      }

      var initer = new channels.channels(init);

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


        initer.emit(msg, msg);
      });

      socket.on('set', function(msg) {
        documents[documentName].parentWindow.window.document.body.innerHTML = msg;
        

        redis_client.set(documentName + ":doc", documents[documentName].parentWindow.window.document.body.innerHTML, function(err, reply) {
          socket.emit('resp', documents[documentName].parentWindow.window.document.body.innerHTML);
          socket.broadcast.emit('update', documents[documentName].parentWindow.window.document.body.innerHTML);
        }); 
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
