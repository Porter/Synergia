module.exports = {
  foo: function (app, pg) {
   var conString = "postgres://porter@localhost/connectivity_development";

   app.get('/test', function(req, res) {
     var client = new pg.Client(conString);
   
     client.connect(function(err) {
       if(err) {
         return console.error('could not connect to postgres', err);
       }
       client.query('SELECT * FROM docs;', function(err, result) {
         if(err) {
           return console.error('error running query', err);
         }
         console.log(JSON.stringify(result));
         client.end();
         res.end(JSON.stringify(result));
       });
     });
 
     setTimeout(function() { res.end("Timed out"); }, 10*1000);
    });

    Sequelize = require('sequelize');
    
    app.get('/test2', function(req, res) {
    
      var sequelize = new Sequelize('postgres://porter@localhost:5432/node_db');

   	var User = sequelize.define('users', {
        username: { type: Sequelize.STRING, allowNull: false, unique: true },
        first_name: {type: Sequelize.STRING, allowNull: false },
        last_name: {type: Sequelize.STRING, allowNull: false },
	password: {type: Sequelize.STRING, allowNull: false },
      },
 {
     freezeTableName: true // Model tableName will be the same as the model name
   });
   
      User.sync().then(function() { 

      User.create({
        first_name: 'John',
        last_name: 'Hancock',
        username: 'test',
        password: 'test'
      });

      });
  

      res.end("F");
    
    });
 
  }
};

