var emailInfo, db;

module.exports = {

  init: function (email_info, DB) {

    emailInfo = email_info;
    db = DB;

    var nodemailer = require('nodemailer');

    // create reusable transporter object using SMTP transport
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: emailInfo.email,
            pass: emailInfo.password
        }
    });

    var time = new Date();

    var hours = (24 + 23 - time.getHours()) % 24;
    var minutes = 60 - time.getMinutes();


    setTimeout(sendEmail, (hours*60 + minutes) * 60 * 1000);
    console.log("sending email in " + ((hours*60 + minutes) * 60 * 1000) + " ms");

    function sendEmail() {


        var collection = db.collection('errors');

        collection.find({}).toArray(function (err, replies) {
            var text = '', html = '<table>';


            for (var i = 0; i < replies.length; i++) {
                var reply = replies[i];

                text += reply.type + ": " + reply.errors.length + "\n";

                html += "<tr><td>" + reply.type + "</td><td>" + reply.errors.length + "</td></tr>";
            }

            html += '</table>';

            var mailOptions = {
                to: 'pmh192@gmail.com', 
                subject: 'The Daily Error', 
                text: text,
                html: html
            };

            transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    console.log("Error sending email".red);
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);

            });
        });

        
    }
  },

  error: function(error, type, message) {

    if (error.hasBeenLogged) {
        console.log("Not logging error that has been logged".yellow);
        console.log(error);
        return;
    }

    toRecord = {};

    toRecord['stack'] = error.stack;
    toRecord['msg'] = error.message;
    toRecord['my_message'] = message;

    var collection = db.collection('errors');
    collection.update(
        {type:type},
        { '$push': {errors:error}},
        {upsert:true},
        function (err, reply) {
            if (err) {
                console.log("Oh boy".red);
                console.log("Error logging an error".red);
                console.log(err);
            }
        }
        );
  }
}