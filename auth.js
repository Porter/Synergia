var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var bcrypt = require('bcrypt-nodejs');


module.exports = {
  foo: function (app, passport, LocalStrategy, db, secure_random, notifier, production) {


    var collection = db.collection('g');




    passport.use(new LocalStrategy(
      function(username, password, done) {

        console.log(username + " is trying to log in");
        if (username.charAt(2) == ':') {
          return done(new Error("bad username"));
        }

        collection.findOne({user:username}, {password:1}, function(err, user) {

          console.log("got");
          console.log(user);
          console.log(err);
          if (err) return done(err);

          if (!user) return done(null, false, {message:"username doesn't exist", code:1});

          console.log('user exists');
          if (user.password == password) {
            console.log("encrypting");
            var encrypted = bcrypt.hashSync(password);
            collection.update({_id:user._id}, {'$set': {password:encrypted}});
            console.log("encrypted " + username + "'s password");
            return done(null, user._id);
          }
          console.log("comparing " + password + " to " + user.password);

          if (bcrypt.compareSync(password, user.password)) {
            console.log("right password");
            return done(null, user._id);
          }

          else {
            console.log("wrong password");
            return done(null, false, {message:"inncorrect password", code:2});
          }

          



          

        });
      }
    ));



    passport.use(
      new GoogleStrategy({
        clientID: '705471905548-fij33vt84b6ld8nq7mh8u30hgafrpel2.apps.googleusercontent.com',
        clientSecret: 'Gcbfn1K0Fd-7WnpE61BfX7i3',
        callbackURL: (production ? "https://tranquil-headland-4781.herokuapp.com/" : "http://localhost/") + "oauth2callback"
      },
      function(accessToken, refreshToken, profile, done) {
        console.log(profile);
        collection.findAndModify(
          { email: profile.emails[0].value },
          [],
          { '$setOnInsert': { displayName: profile.displayName, hasUserName: false, user: "gU:" + profile.emails[0].value} },
          { upsert: true, 'new': true },
          function (err, user) {

            if (err) {
              done(err);
              console.log(err);
              return;
            }
            console.log("user after update")
            console.log(user);
            return done(err, user.value._id);
          });
      })
    );

    
    passport.serializeUser(function(user, done) {
      done(null, user);
    });
    
    passport.deserializeUser(function(id, done) {
      done(null, id);
    });
    
    
    app.post('/login', function(req, res) {

      console.log("username: " + req.body.username);
      console.log("password: " + req.body.password);

      if (!req.body.password) {
        res.end("1");
        return;
      }
    

      passport.authenticate('local', function(err, user, info) {

        console.log('info:' + JSON.stringify(info));

        if (!user) {
          res.redirect('/login?message=' + info['message'] + '&code=' + info['code']);
          return;
        }

        req.login(user, function(err) {
          if (err) { res.end(err.toString()); return (err); }
          console.log("req.user: " + JSON.stringify(req.user));
          return res.redirect('/');
        });
    
      })(req, res);
    });

    app.get('/auth/google', function (req, res) {
      var state = req.param('redirect') ? encodeURIComponent(req.param('redirect')) : '/';
      passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.email', state:state}) (req, res);
    });

    app.get(
      '/oauth2callback', 
      passport.authenticate('google', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect(decodeURIComponent(req.param('state')));
      });


    app.get('/logout', function(req, res){
      req.logout();
      res.redirect('/');
    });


    app.post('/createUser', function(req, res) {
      console.log("username: " + req.body.username);
      console.log("password: " + req.body.password);

      if (!req.body.username || !req.body.password || !req.body.email) {
        return res.redirect('/login?email=' + req.body.email + "&username=" + req.body.username + '&redirect=' + '/login');
      }

      
      var userInfo = {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email
      };


      notifier.sendConfirmation(userInfo['email'], userInfo);
      res.end("You now need to confirm your email, check you inbox");
      return;


      
    });
  
    app.get('/confirm', function(req, res) {
      var collection = db.collection('toBeConfirmed');
      

      collection.findOne({token:req.query.token}, function(err, reply) {
        
        var userInfo = reply.userInfo;

        
        var collection = db.collection('g');
        collection.findAndModify(
          {email: userInfo['email']},
          [],
          {
            '$set' : {
              user:userInfo['username'],
              password:bcrypt.hashSync(userInfo['password']),
              email: userInfo['email'],
              hasUserName: true
            }
          },
          {upsert: true, 'new':true},

          function(err, result) {
            if (err) { console.log(err); res.redirect("/"); return; }

            req.logIn(result.value._id.toString(), function (err) {
                if(!err){
                    res.redirect('/');
                }else{
                    res.end(err.toString());
                }
            });

            // passport.authenticate('local', function(err, user, info) {
            //   req.login(user, function(err) {
            //     if (err) { console.log(err); return (err); }
            //     console.log("req.user: " + JSON.stringify(req.user));
            //     return res.redirect('/');
            //   });
            // })(req, res);

          });


      });
    });
  }
};


