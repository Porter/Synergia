module.exports = {
  foo: function (dependencies) {

    var app = dependencies.app;
    var express = dependencies.express;
    var fs = dependencies.fs;

    function loggedIn(req, res, next) {
      if (req.user) {
          next();
      } else {
        console.log('user not logged in');
          res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
      }
    }


    app.use('/', function (req, res, next) {
      var time = (new Date()).getTime();
      res.on('finish', function() {
        //console.log('served ' + req.url + " in " + ((new Date()).getTime() - time) + "ms");
      });

      next();
    });
    

    // turns a request for /req into a request for /req.html, as long as req.html exists in src/html/static
    app.use(function(req, res, next) {
      if (req.path.indexOf('.') === -1) {
        var file = __dirname + "/../html/static" + req.path + '.html';
        fs.exists(file, function(exists) {
          if (exists) {

            var index = req.url.indexOf('?');
            if (index === -1) {
              req.url += '.html';
            }
            else {
              var b4 = req.url.substring(0, index);
              var after = req.url.substring(index);
              req.url = b4 + '.html' + after;
            }
          }
          next();
        });
      }
      else
        next();
    });


    var requiresLoggedIn = ['/', '/docs/view'];

    for (var i = 0; i < requiresLoggedIn.lengtht; i++) {
      app.get(requiresLoggedIn[i], loggedIn);
    }

    app.use('/', express.static(__dirname + '/../html/static'));
  }
}
