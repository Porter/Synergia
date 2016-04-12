var db, async;

module.exports = {

	init: function(db_, async_) {
		db = db_;
		async = async_;
	},


	getTag: function(name, finalCallback) {
		if (name == undefined) return callback(new Error("missing name"), null);
		
		var toFind = {};
		toFind[name] = {'$exists':true};

		var tags = db.collection('tags');
		var tagInfo = db.collection('tagInfo');

		// async.parallel([
		// 	function(callback) {

		// 		var want = {};
		// 		want[name] = 1;v
		// 		tags.findOne(toFind, want, function(err, reply) { 
		// 			callback(err, reply);
		// 		});	
		// 	},

			// function(callback) {

				console.log("^" + name);
				tagInfo.find({name:{'$regex':'^' + name}}, {name:1}).toArray(function(err, replies) {
					// callback(err, replies);
					finalCallback(err, replies);
				});
			// }

		// 	],
		// 	function(err, reply) {
		// 		finalCallback(err, reply);
		// 	}
		// );


		
	},


	createTag: function(name, parentName, isRoot, finalCallback) {

	  var tags = db.collection('tagInfo');
	  async.waterfall([
	    

	    function(callback) {

	      if (name == undefined) return callback(new Error("missing name"));
	      if (!isRoot && parentName == undefined) return callback(new Error("missing parentName"));

	      if (name.indexOf('|') != -1) {
	        return callback(new Error("tag can't have character '|'"));
	      }





	      var nameToFind, query = {};

	      if (isRoot) {
	        nameToFind = name;
	      }
	      else {
	        nameToFind = parentName + "|" + name;
	        //nameToFind = nameToFind.replace(".", '\uff0');
	      }

	      tags.findOne({name:nameToFind}, {_id:1}, function(err, reply) {
	      	callback(err, reply, nameToFind);
	      });



	      // query[nameToFind] = {'$exists':true};

	      // tags.findOne(query, {}, function(err, reply) {
	      //   console.log('finding ' + JSON.stringify(query) + '\n');
	      //   if (reply) {
	      //     console.log("it exists: " + JSON.stringify(reply) + "\n");
	      //   }
	      //   else {
	      //     console.log("it doesn't exists: " + JSON.stringify(reply) + "\n");
	      //   }
	      //   callback(null, reply);
	      // });
	    },


	    function (reply, nameToFind, callback) {
	      
	      if (reply) {
	        callback(new Error("tag already exists"));
	        return;
	      }

	      tags.insert({name:nameToFind}, function(err, reply) {
	      	callback(err, reply);
	      });


	      // if (isRoot) {
	      //   var toInsert = {};
	      //   toInsert[name] = {};

	      //   console.log("inserting " + JSON.stringify(toInsert) + "\n");
	      //   tags.insert( toInsert, function(err, reply) {
	      //       callback(err, name);
	      //     }
	      //   );
	      // }
	      // else {
	      //   var newTag = parentName + "." + name;

	      //   var toSet = {};
	      //   toSet[newTag] = {};

	      //   query = {};
	      //   query[parentName] = {'$exists':true};

	      //   console.log("updating " + JSON.stringify(toSet) + "with query" + JSON.stringify(query) + "\n");            

	      //   tags.update(
	      //     query,
	      //     {'$set': toSet},
	      //     function(err, reply) {
	      //       callback(err, newTag);
	      //     }
	      //   );
	      // }          
	    }],

	    // function(newTag, callback) {
	    //   newTag = newTag.replace(".", "|");

	    //   tagInfo.insert({name:newTag}, function(err, reply) {
	    //     callback(err, reply);
	    //   });

	    // }],


	    function(err, results) {
	      if (err) {
	        console.log("error: " + err.message);
	      }
	      else {
	        console.log(JSON.stringify(results));
	      }
	      finalCallback(err, results);
	    }
	  );
	},


	tagDocument: function(docId, tagId, finalCallback) {
		var tags = db.collection('tagInfo');
		var documents = db.collection('documents');

		if (docId == undefined) return finalCalback(new Error("docId is undefined"));
		if (tagId == undefined) return finalCalback(new Error("tagId is undefined"));

		async.parallels([

			function(callback) {
				documents.update({_id:docId}, {'$push':{tags:tagId}}, function(err, reply) {
					callback(err, reply);
				})
			},

			function(callback) {
				tags.update({_id:tagId}, {'$push': {docs:docId}}, function(err, reply) {
					callback(err, reply);
				});
			}

			],
			function(err, results) {
				finalCallback(err, results);
			}
		);
	}
}
