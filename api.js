
module.exports = {
  foo: function (app, channels, db, secure_random, async) {

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


  }
}
