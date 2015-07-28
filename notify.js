var emailInfo;

var nodemailer = require('nodemailer');

var transporter;
var isProduction;
var random;
var db;

module.exports = {

  init: function(email_info, rand, database, production) { 
    isProduction = production;
    emailInfo = email_info;
    random = rand;
    db = database;

    transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: emailInfo.email,
            pass: emailInfo.password
        }
    });
  },

  send: function (emails, docId, doc) {

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

  sendConfirmation: function (email, userInfo) {

    var token = random(10).toString(); // 10 random bytes

    var url = isProduction ? "https://tranquil-headland-4781.herokuapp.com/" : "http://localhost/";

    url += 'confirm?token=' + encodeURIComponent(token);

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
