console.log('---------------------------------------------------------');
console.log('here we go');
console.log('---------------------------------------------------------');



var express = require('express');
var app = express();

app.get('/', express.static(__dirname + '/test.html'));

app.use('/processing.min.js', express.static(__dirname + '/processing.min.js'));
app.use('/hello-web.pde', express.static(__dirname + '/hello-web.pde'));

app.get('/test', function(req, res) {
    res.sendFile(__dirname + "/test.html");

  });

app.listen(80, function(){
  console.log('listening on *:' + 80);
});
