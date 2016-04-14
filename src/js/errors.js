

module.exports = {
  foo: function (dependencies, stats) {

    var app = dependencies.app;
    var channels = dependencies.channels;
    var db = dependencies.db;
    var secure_random = dependencies.secure_random;
    var async = dependencies.async;
    var swig = dependencies.swig;
    var BSON = dependencies.BSON;

    app.get('/errors', function(req, res) {
    
    var collection = db.collection('errors');

    var aggregate = false;

    var find = {}, group = {};

    if (req.query.keys) {
      aggregate = true;

      group = {_id:'$type', len: {'$first' : {'$size':'$errors'}}};
    }
    
    if (aggregate) {
      collection.aggregate([
        {'$match':{}},
        {'$group':group}
      ],
      function (err, replies) {
        res.end(JSON.stringify(replies));
      });
    }
    else {
      collection.find({}).toArray(function (err, replys) {
        res.end(JSON.stringify(replys));
      });
    }

  });

  app.post('/reportError', function(req, res) {
    
    var body = '';
    console.log("error".red);
    console.log(req.body.error.message + " on line #" + req.body.error.line);

    stats.error(req.body.error, 'client ' + req.body.error.message);

    res.end('');
    
  });
  }
}
