var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


module.exports = {
  foo: function (app, passport, LocalStrategy, db, secure_random) {


    var collection = db.collection('g');




    passport.use(new LocalStrategy(
      function(username, password, done) {

        console.log(username + " is trying to log in");
        collection.findOne({user:username}, function(err, user) {

          console.log("got");
          console.log(user);
          if (err) return done(err);

          if (!user) return done(null, false, {message:"username doesn't exist"});

          return done(null, user._id);

        });
      }
    ));



    passport.use(
      new GoogleStrategy({
        clientID: '705471905548-fij33vt84b6ld8nq7mh8u30hgafrpel2.apps.googleusercontent.com',
        clientSecret: 'Gcbfn1K0Fd-7WnpE61BfX7i3',
        callbackURL: "http://localhost/oauth2callback"
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

      
      var collection = db.collection('g');
      collection.insert(
        {
          user:req.body.username,
          password:req.body.password,
          hasUserName: true
        },

        function(err, result) {
          if (err) { console.log(err); res.redirect("/"); return; }

          passport.authenticate('local', function(err, user, info) {
            req.login(user, function(err) {
              if (err) { console.log(err); return (err); }
              console.log("req.user: " + JSON.stringify(req.user));
              return res.redirect('/');
            });
          })(req, res);

        });
    });
  

  }
};


