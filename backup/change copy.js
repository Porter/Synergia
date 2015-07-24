function continuationLength(string1, pos1, string2, pos2) {
	for (var length = 0; pos1 < string1.length && pos2 < string2.length; pos1++, pos2++) {
		if (string1[pos1] != string2[pos2]) break;
		length++;
	}
	return length;
}

function findContinuation(string1, pos1, string2, pos2) {
	var start = string1[pos1];
	
	var indexes = []
	for (var i = pos2; i < string2.length; i++) {
		if (string2[i] == start) {
			indexes.push(i);
		}
	}
	
	var maxLength = -1, maxIndex = -1;
	for (var i = 0 ; i < indexes.length; i++) {
		index = indexes[i];
		
		var length = continuationLength(string1, pos1, string2, index);
		if (length > maxLength) {
			maxLength = length;
			maxIndex = index;
		}
	}
	//console.log("start is " + start + " " + string1[maxIndex]);
	return [maxIndex, maxLength];
	
}


function changes(val1, val2) {
	var changes = [];
	
	for (var pos1 = 0, pos2 = 0; pos1 < val1.length && pos2 < val2.length;) {
		
		//console.log("pos1: " + pos1 + " " + val1.substring(pos1));
		//console.log("pos2: " + pos2 + " " + val2.substring(pos2));
		
		var ch1 = val1[pos1];
		var ch2 = val2[pos2];
		
		if (ch1 != ch2) {
			var addition = findContinuation(val1, pos1, val2, pos2+1);
			
			var deletion = findContinuation(val2, pos2, val1, pos1+1);
			
			if (addition[0] > deletion[0]) { // additions
				var stuff = addition;
				
				//console.log(JSON.stringify(stuff));
				
				
				var length = stuff[0] - pos2; // length of addition
				
				//console.log("addition at index " + pos1 + " with length of " + length + ": '" + val2.substring(stuff[0]-length, stuff[0]) + "' giving you: " + val2.substring(stuff[0], stuff[0]+stuff[1]));
				
				changes.push([pos1, val2.substring(stuff[0]-length, stuff[0])]);
				
				pos2 += length;
				continue;
			}
			else if (addition[0] < deletion[0]) {
				var stuff = deletion;
				
				var length = stuff[0] - pos1; // length of deletion
				
				//console.log("deletion at " + pos1 + " with length of " + length + ": '" + val1.substring(stuff[0]-length, stuff[0]) + "' giving you: " + val1.substring(stuff[0], stuff[0]+stuff[1]));
				
				changes.push([pos1, length]);
				
				pos1 += length;
				continue;
			}
			else if (addition[0] == deletion[0]) {
				//console.log("delete and add are the same");
				//console.log(JSON.stringify(addition));
				//console.log(JSON.stringify(deletion));
				
				//console.log("replacing '" + val1[pos1] + "' at index " + pos1 + " with '" + val2[pos2] + "'")
				changes.push([pos1, val2[pos2], 1]);
			}
			
		}
		pos1++;
		pos2++;
	}
	
	//console.log("-------------------------------------------- Final ------------------------------------------------------------");
	
	
	//console.log("deleting range [" + val2.length + ", " + pos1 + "]: " + val1.substring(pos1, val1.length));
	if (pos1 != val1.length) {
		var post = [val2.length, val1.length - pos1];
		post.isPost = true;
		changes.push(post);
	}
	
	
	//console.log("adding at " + val2.length + ": " + val2.substring(pos2, val2.length));
	if (pos2 < val2.length) {
		var post = [pos2, val2.substring(pos2)];
		post.isPost = true;
		changes.push(post);
	}
	
	//console.log(JSON.stringify(changes));
	
	return changes;

	
	
}

function check(changes) {
	val1 = document.getElementById("section1").innerHTML;
	val2 = document.getElementById("section2").innerHTML;
	
	var offset = 0;
	
	for (var i = 0; i < changes.length; i++) {
		
		var change = changes[i];
		//console.log(val1);
		
		if (change.isPost) offset = 0;
		
		if (change.length == 3) { // replacement
			change[0] += offset;
			
			
			//console.log("replacing " + change[2] + " chars at " + change[0] + " with '" + change[1] + "'");
			val1 = val1.substring(0, change[0]) + change[1] + val1.substring(change[0] + change[2]);
			
			offset += change[1].length;
			offset -= change[2];
		}
		else if (typeof change[1] == "string") { // addition
			change[0] += offset;
			
			
			//console.log("adding '" + change[1] + "' at " + change[0]);
			val1 = val1.substring(0, change[0]) + change[1] + val1.substring(change[0]);
			
			offset += change[1].length;
		}
		else {
			change[0] += offset;
			
			//console.log("removing " + change[1] + " characters from " + change[0]);
			val1 = val1.substring(0, change[0]) + val1.substring(change[0] + change[1]);
			
			offset -= change[1];
		}
	}
	//console.log(val1);
	//console.log(val2);
	
}
