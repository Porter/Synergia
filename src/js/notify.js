var emailInfo;

var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt-nodejs');

var transporter;
var isProduction;
var random;
var db;

function inArr(el, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == el) return true;
    }
    return false;
}

module.exports = {

  init: function(dependencies) { 
    isProduction = dependencies.inProduction;
    emailInfo = dependencies.email;
    random = dependencies.secure_random;
    db = dependencies.db;
    app = dependencies.app;

    transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: emailInfo.email,
            pass: emailInfo.password
        }
    });

    app.get('/confirmInvite', function(req, res) {
        var token = req.query.token;

        var invites = db.collection('toBeConfirmed');

        invites.findOne({token:token}, function(err, reply) {
            res.redirect('/signup?email=' + encodeURIComponent(reply.userInfo.email) + "&token="+encodeURIComponent(token)
             + '&redirect=' + encodeURIComponent('/docs/view?doc=' + reply.doc));
        })
    });

    app.get('/confirm', function(req, res) {
      console.log('confirming token', req.query.token);
      var collection = db.collection('toBeConfirmed');
      

      collection.findOne({token:req.query.token}, function(err, reply) {
        
        console.log("userInfo", reply);
        var userInfo = reply.userInfo;

        var collection = db.collection('toBeConfirmed');
        collection.update({_id:reply._id}, {'$set':{confirmed:true}});

        
        collection = db.collection('g');
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

  },

  send: function (emails, docId) {

    var url = isProduction ? "https://tranquil-headland-4781.herokuapp.com/" : "http://localhost/";

    url += "docs/view?doc=" + docId;

    var mailOptions = {
        to: emails, 
        subject: 'Your notification', 
        text: "You've been notified. " + url,
        html: "You've been notified. <a href='" + url + "'>Get over here</a>"
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log("Error sending email".red);
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);

    });
  },

  sendEmail: function (emails, title, message) {

    
    var mailOptions = {
        to: emails, 
        subject: title, 
        text: message,
        html: message
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log("Error sending email".red);
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);

    });
  },

  invite: function(req, res) {

    var emails = req.body.emails, doc = req.body.docId;

    var usrs = db.collection('g');

    usrs.find({email:{'$in':emails}}, {email:1}).toArray(function(err, replies) {

        replies = replies.map(function(reply) { return reply.email; });

        emails.forEach(function (email) {
            if (inArr(email, replies)) {
                console.log("we know " + email);
                module.exports.send(email, doc);
            }
            else {
                console.log(email + " is new");
                module.exports.sendInvite(email, doc);
            }

        });

        res.end("");

    });
  },

  sendInvite: function(email, docId) {
    var token = random(10).toString(); // 10 random bytes

    var url = isProduction ? "https://tranquil-headland-4781.herokuapp.com/" : "http://localhost/";

    url += 'confirmInvite?token=' + encodeURIComponent(token);

    var collection = db.collection('toBeConfirmed');

    console.log("writing token", token);

    collection.insert(
      {
        token: token,
        userInfo: {email: email},
        doc: docId,
        time: (new Date()).getTime()
      }
    );

    var mailOptions = {
        to: email, 
        subject: "You've been invited", 
        text: "Wow! Lucky you. Someone invited you to their document. Go here: " + url,
        html: "Wow! Lucky you. Someone invited you to their document. <a href='" + url + "'>Check it out yo</a>"
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log("Error sending email".red);
            return console.log(error);
        }
        else {
            console.log('Message sent: ' + info.response);
        }

    });
  },

  sendConfirmation: function (email, userInfo) {

    var token = random(10).toString(); // 10 random bytes

    var url = isProduction ? "https://tranquil-headland-4781.herokuapp.com/" : "http://localhost/";

    url += 'confirm?token=' + encodeURIComponent(token);

    console.log("writing token", token);

    var collection = db.collection('toBeConfirmed');

    collection.insert(
      {
        token: token,
        userInfo: userInfo
      }
    );

    var mailOptions = {
        to: email, 
        subject: 'Confirm Email ', 
        text: "You need to confirm this email address. Go here: " + url,
        html: "You need to confirm this email address. Press <a href='" + url + "'>here</a>"
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log("Error sending email".red);
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);

    });
  }
}
