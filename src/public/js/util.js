var exports;
if (typeof(module) != "undefined") exports = module.exports = {};
else exports = {};

function min(a, b) {
	return a < b ? a : b;
}



function getText(div) {
	var children = div.childNodes;
	var texts = [], lastName = "";
	for (var i = 0; i < children.length; i++) {
		var child = children[i], name = child.nodeName.toLowerCase();

		var lastLoop = i == children.length - 1;

		if (name == "#text" || name == "span" || name == "font") {
			
			if (lastName == "#text" || lastName == "span" || lastName == "font") { 
				var last = texts.pop();
				last += child.textContent;
				texts.push(last);
			}
			else {
				texts.push(child.textContent);
			}
		}
		else if (name == "div") {
			var t = getText(child);


			if (lastName == "#text" || lastName == "span" || lastName == "font") { 
				var last = texts.pop();
				last += child.textContent;
				texts.push(last);
			}
			else {
				texts.push(t);
			}
		}
		else if (name == "br" && lastName != "#text") {
			if (!lastLoop || children.length == 1) texts.push("")
		}

		lastName = name;
	}

	return texts.join('\n').replace(/ /g, ' ');
}

function colorsLength(colors) {
	var l = 0;
	for (var i = 0; i < colors.length; i++) {
		l += colors[i][0];
		if (colors[i][0] < 0) {
			throw new Error("negative color");
		}
		if (!colors[i][1]) {
			console.log(JSON.stringify(colors));
			throw new Error("null color");
		}
	}
	return l;
}

function fixSpaces(text) {
	/*for (var j = 0; j < text.length && text.charAt(j) == ' '; j+=6) {
		text = text.substring(0, j) + '&nbsp;' + text.substring(j+1);
	}
	for (var j = text.length-1; j >= 0 && text.charAt(j) == ' '; j--) {
		text = text.substring(0, j) + '&nbsp;' + text.substring(j+1);
	}*/
	return text.replace(/ /g, '&nbsp');
}


function setText(text, div, colors) {
	div.innerHTML = "";


	if (!colors) {
		colors = [[text.length, 'green']];
	}

	if (colorsLength(colors) != text.length) {
		console.log(JSON.stringify(colors));
		console.log(text);
		throw new Error('length mismatch');
	}

	var lines = text.split('\n'), pos = 0, subpos = 0;
	
	var left = 0;
	if (pos < colors.length) left = colors[pos][0] - subpos;
	
	for (var i = 0; i < lines.length; i++) {
		var d = document.createElement('div');
		

		var text = lines[i];

		if (text == "") {
			text = "<br/>";
			d.innerHTML = text;
			div.appendChild(d);


			left--;
			if (left <= 0) {
				pos++; subpos = 0;
				if (pos < colors.length) left = colors[pos][0] - subpos;
			}


			continue;
		}


		var texts = [];
		while (text.length > 0) {
			if (left >= text.length) {

				texts.push([text, colors[pos][1]]);
				left -= text.length;
				text = "";
			}
			else {
				if (left != 0) {
					texts.push([text.substring(0, left), colors[pos][1]]);
					text = text.substring(left);
				}
				

				pos++; subpos = 0;
				left = colors[pos][0] - subpos;
			}
		}

		for (var n = 0; n < texts.length; n++) { // remove preceding spaces with &nbsp;
			texts[n][0] = fixSpaces(texts[n][0]);
		}

		for (var n = 0; n < texts.length; n++) {

			if (!userLookup) {
				console.error("userLookup is null");
			}
			if (!userLookup[texts[n][1]]) {
				console.log(JSON.stringify(userLookup));
				console.error("userLookup doesn't have user: " + texts[n][1]);
			}

			var colorData = userLookup[texts[n][1]].colors[0];
			d.innerHTML += '<span style="color:' + colorData.color + '">' + texts[n][0] + '</span>';
		}

		div.appendChild(d);
		left--;
		if (left <= 0) {
			pos++; subpos = 0;
			if (pos < colors.length) left = colors[pos][0] - subpos;
		}
	}
}


function checkColors(colors, div, pos, subpos) {

	if (!subpos && !pos) {
		pos = subpos = 0;
	}

	var children = div.childNodes;
	for (var i = 0; i < div.children.length; i++) {

	}
}


function testText(div) {
	var t = getText(div);
	setText(t, div);


	return t == getText(div);
}

function testText2(div) {
	for (var i =0; i < 100; i++) {
		var text = "";

		for (var n = 0; n < 100; n++) {
			text += String.fromCharCode(65 + Math.floor(Math.random()*40));
			while (Math.random() < .2) text += '\n';
		}

		setText(text, div);
		if (!testText(div)) {
			console.log('fail');
			console.log(text);
			return;
		}
	}
	return 'pass';
}

function removeEmptyDivs(div) {
	var children = div.childNodes;
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		if (child.nodeName.toLowerCase() != "div") continue;

		if (child.childNodes.length == 0) {
			div.removeChild(child);
		}
		else {
			removeEmptyDivs(child);
		}
	}
}


function isAncestor(child, ancestor) {
	child = child.parentNode;
	if (!child) return false;

	if (child == ancestor) return true;

	return isAncestor(child, ancestor);
}

function previousNode(node, stopAt) {
	if (node.previousSibling != undefined) { return node.previousSibling; }
	
	node = node.parentNode;
	if (node == stopAt) return;
	
	return previousNode(node, stopAt);
	
}

function nextNode(node, stopAt) {
	if (node.nextSibling != undefined) { return node.nextSibling; }
	
	node = node.parentNode;
	if (node == stopAt) return;
	
	return nextNode(node);
}

function getCursor(div) {
	var sel = window.getSelection();
    if (sel.rangeCount > 0) {
        var range = window.getSelection().getRangeAt(0);

        //if (!isAncestor(range.startContainer, div)) return;

        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(div);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        
        var r = [];
        var start = range.startOffset, startContainer = range.startContainer;

        for (var i = 0; i < 2; i++) {
            var len = preCaretRange.toString().length;
            var info = 0;

            if (start == 0 || startContainer.nodeName.toLowerCase() != "#text") {
            	info = 1;

            	var node = previousNode(startContainer);
            	if (!isAncestor(node, div)) node = startContainer;

            	while (node && node.textContent.length == 0) {
            		node = previousNode(node);
            		info++;
            	}
            }

            r.push([len, info]);


            preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(div);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            start = range.endOffset;
            startContainer = range.endContainer;
        }

        return r;
    }
}


function nodeAt(pos, node, isStructure) {
	var len = pos;

	var children = node.childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];

		var textLength;
		if (isStructure) { textLength = structureLength(child); }//console.log(strip(child), " is ", textLength);}
		else { textLength = child.textContent.length; }

		len -= textLength;
		//console.log("len is now", len);

		if (len <= 0) {
			len += textLength;
			
			if (child.nodeName.toLowerCase() == "#text") return [child, len];
			return nodeAt(len, child, isStructure);

		}
	}
}

function getRange(pos, div) {

	var n = nodeAt(pos[0], div);

	if (!n) return n;

	if (n[1] != 0) {
		for (var i = 0; i < pos[1]; i++) {
			n[0] = nextNode(n[0]);
			n[1] = 0;
		}
	}

	var nodeName = n[0].nodeName.toLowerCase();
	while (nodeName != "#text" && n[0].childNodes.length > 0) {
		n[0] = n[0].childNodes[0];
	 }

	 if (n[0].nodeName.toLowerCase() == "br") n[0] = n[0].parentNode; // can't have the cursor in a <br>

	return n;
}

function setCursor(pos, div) {
	if (!pos) return;
	
	var start = getRange(pos[0], div);
	var end = getRange(pos[1], div);

	if (pos[1][0] >= pos[0][0]) {
		if (pos[1][0] > pos[0][0] || pos[1][1] > pos[0][1]) {
			var t = start;
			start = end;
			end = t;
		}
	}
	
	if (start && end) {
		var range = document.createRange();
		range.setStart(start[0], start[1]);
		range.setEnd(end[0], end[1]);
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}
}


function copyColors(colors) {
	var c = [];
	for (var i = 0; i < colors.length; i++) {
		c.push(colors[i].slice());
	}
	return c;
}
exports.copyColors = copyColors;

exports.copyEdit = copyEdit = copyColors;


function applyOffsets(second, first) {
	for (var i = 0; i < second.length; i++) {

		var location = second[i][1];
		for (var n = 0; n < first.length; n++) {

			if (first[n][1] == location && first[n][0] == "right" && second[i][0] == "right") { // if two people delete the same thing
				// then delete the second person's deletion
				second.splice(i, 1);
				i--;
				break;
			}

			if (first[n][1] > location) break;

			if (first[n][0] == "right" && first[n][1] == location) break;

			var off = first[n][0] == "down" ? 1 : -1;

			second[i][1] += off;
		}
	}
}
exports.applyOffsets = applyOffsets;

function applyOffsetToCursor(cursor, edit) {
	if (!cursor) return;
	for (var i = 0; i < cursor.length; i++) {
		for (var n = 0; n < edit.length; n++) {
			if (edit[n][1] >= cursor[i][0]) break;

			var offset = edit[n][0] == "down" ? 1 : -1;

			cursor[i][0] += offset;
		}
	}
}

function randomCapitalLetter() {
	return String.fromCharCode(parseInt(Math.random()*26) + 65);
}

function randomLowerLetter() {
	return String.fromCharCode(parseInt(Math.random()*26) + 97);
}


// will modify the text in the given textarea within the given range
// this function is used for automated testing
function modify(textarea, range, ch, userId) {
	if (stopAllJavascript) return;
	var originalRange = range;
	var text = getText(textarea);
	if (!range) {
		range = [0, text.length]
	}
	// ['sd', true] will be a range from the index of 'sd' and on
	// ['sd', false] will be a range from 0 to the index of 'sd'
	// if the given string is not found, the range will be from the beginning to the end
	if (typeof(range[0]) == "string") {
		var index = text.indexOf(range[0]);
		if (index == -1) {
			range = [0, text.length];
		}
		else {
			if (range[1]) {
				range = [index+1, text.length];
			}
			else {
				range = [0, index];
			}
		}
	}
	var rangeLength = range[1] - range[0];
	var position = parseInt(range[0] + Math.random() * rangeLength);
	var length = parseInt(text.length*Math.random() * .01 + Math.random() * 5);
	// 50-50 chance of adding or deleting
	if (Math.random() > .5) {
		var toAdd = "";
		for (var i = 0; i < length; i++) {
			toAdd += ch();
		}
		text = text.substring(0, position) + toAdd + text.substring(position);
	}
	else {
		if (position + length > range[1]) { // if we would delete text past the range
			position = range[1] - length; // then move the position back
			if (position < range[0]) { // but if our position is then before our range
				position = range[0]; // set the position to the begginning of the range
				length = Math.max(0, range[1] - position); // and set the length to the length of the range
			}
		}
		text = text.substring(0, position) + text.substring(position + length);
	}
	console.log(text, [[text.length, userId]]);
	setText(text, textarea, [[text.length, userId]]);
	setTimeout(function() { modify(textarea, originalRange, ch, userId); }, 100);

}


