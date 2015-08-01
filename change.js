if (typeof exports != "undefined") exports.setDocument = function (doc) { document = doc; }
if (typeof exports != "undefined") exports.setColor = function (col) { color = col; }

function strip(node) {
	if (!node) return undefined;
	if (node.nodeName.toLowerCase() == "#text") return document.createTextNode(node.textContent);

	var cloned = document.createElement(node.nodeName.toLowerCase());
	cloned.innerHTML = node.innerHTML;

	var children = cloned.childNodes;
	for (var i = 0; i < children.length; i++) {
		cloned.replaceChild(strip(children[i]), children[i]);
	}

	return cloned;

}

if (typeof exports != "undefined") {
	exports.strip = strip;
}


function setColor(col) { color = col; }

var prefix = "";

function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }

function abs(a) { return a >= 0 ? a : -a; }

function isAddition(change) { return typeof change[1] == "string" && change.length == 2; }
function isDeletion(change) { return typeof change[1] != "string"; }
function isReplacement(change) { return typeof change.length == 3; }

function isArray(obj) { return Object.prototype.toString.call(obj) === '[object Array]' }

function getColor(node, stopAt) {
	if (node.color) {
		return node.color;
	}
	node = node.parentNode;
	if (node == stopAt || node == undefined) return;
	return getColor(node, stopAt);
	
}


function previousNode(node, stopAt) {
	if (node.previousSibling != undefined) { return node.previousSibling; }
	
	node = node.parentNode;
	if (node == stopAt) return;
	
	return previousNode(node, stopAt);
	
}

function rightMostTextNode(node) {
	if (node.nodeName.toLowerCase() == "#text") return node;

	var children = node.childNodes;
	for (var i = children.length - 1; i >= 0; i--) {
		var r = rightMostTextNode(children[i]);
		if (r) return r;
	}
}

function previousTextNode(node, stopAt) {
	if (node.previousSibling != undefined) { 
		var rightMost = rightMostTextNode(node.previousSibling);
		if (rightMost) return rightMost;
	}
	
	node = node.parentNode;
	if (node == stopAt) { console.log("stopped"); return; }
	
	return previousTextNode(node, stopAt);
	
}

function nextNode(node, stopAt) {
	if (node.nextSibling != undefined) { return node.nextSibling; }
	
	node = node.parentNode;
	if (node == stopAt) return;
	
	return nextNode(node);
}

function leftMostTextNode(node) {
	if (node.nodeName.toLowerCase() == "#text") return node;

	var children = node.childNodes;
	for (var i = 0; i < children.length; i++) {
		var l = leftMostTextNode(children[i]);
		if (l) return l;
	}
}

function nextTextNode(node, stopAt) {
	if (node.nextSibling != undefined) { 
		var leftMost = leftMostTextNode(node.nextSibling);
		if (leftMost) return leftMost;
	}
	
	node = node.parentNode;
	if (node == stopAt) return;
	
	return nextTextNode(node, stopAt);
}

function isWellFormed(node, soFar) {
	
	soFar = soFar || [];
	
	var children = node.childNodes;
	
	var pre = soFar.join("-");
	if (soFar.length != 0) pre += "-";
	
	for (var i = 0; i < children.length; i++) {
		
		var child = children[i];
		
		if (child.childNodes.length == 0) {
			continue;
		}
		
		if (child.id != prefix + pre + i) return false;
		
		soFar = soFar.slice();
		soFar.push(i);
		if (!isWellFormed(child, soFar)) return false;
		
	}
	
	return true;
}

function form(node, soFar) {
	soFar = soFar || [];
	
	var children = node.childNodes;
	
	var pre = soFar.join("-");
	if (soFar.length != 0) pre += "-";
	
	for (var i = 0; i < children.length; i++) {
		
		var child = children[i];
		
		if (child.childNodes.length == 0) {
			continue;
		}
		
		child.id = prefix + pre + i;
		
		var soFarCopy = soFar.slice();
		soFarCopy.push(i);
		form(child, soFarCopy);
		
	}
}

function AttrsToDict(attrs) {
	var cloned = {};

	if (!attrs) return cloned;
	for (var i = 0; i < attrs.length; i++) {
		cloned[attrs[i].name] = attrs[i].value;
	}
	return cloned;
}

function removeAllAttrs(element) {
    for (var i= element.attributes.length; i-->0;)
        element.removeAttributeNode(element.attributes[i]);
}

function setAttrs(element, dict) {
    for (var i in dict)
        element.setAttribute(i, dict[i]);
}

function form2(node, color, isStructure) {
	var children = node.childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];

		if (child.nodeName.toLowerCase() != "div") {
			var nextSibling = child.nextSibling;

			var div = document.createElement("div");
			div.appendChild(child);

			node.insertBefore(div, nextSibling);

			child = div;
		}

		var fonts = child.childNodes;

		for (var n = 0; n < fonts.length; n++) {

			//console.log(child.outerHTML);
			//console.log("looking at ");
			//console.log(fonts[n].outerHTML);

			var font = fonts[n];

			if (font.nodeName.toLowerCase() != "font") { // add it as a child to a font and try again
				var nextSibling = font.nextSibling;

				var parentFont = document.createElement("font");
				parentFont.appendChild(font);

				child.insertBefore(parentFont, nextSibling);


				n--;
				continue;
			}

			if (font.childNodes.length == 0) {
				child.removeChild(font);
				n--;
				continue;
			}

			if (isStructure && font.childNodes[0].textContent == "0") {
				if (font.childNodes.length <= 2) {
					if (font.childNodes.length == 2 && font.childNodes[1].childNodes[0] && font.childNodes[1].childNodes[0].nodeName.toLowerCase() != 'br') {
						child.removeChild(font);
						n--;
						continue;
					}
				}
				else {
					child.removeChild(font);
					n--;
					continue;
				}
			}


			var styleColor = font.style.color;
			if (styleColor) {
				var colorColor = font.color;

				if (!colorColor) {
					font.color = tinycolor(styleColor).toHexString();
				}
				font.style.color = "";
			}
			if (!font.color) {
				font.color = color;
			}

			if (font.childNodes.length == 0) {
				if (fonts.length == 1) {
					font.appendChild(document.createElement('br'));
				}
				else {
					child.removeChild(font);
					n--;
				}

			}
			else if (font.childNodes.length == 1){
				var name = font.childNodes[0].nodeName.toLowerCase();

				if (name != "#text" && name != "br") {
					var fontChild = font.childNodes[0], type = fontChild.nodeName.toLowerCase();

					var fontChildChildren = fontChild.childNodes;

					var attrs = AttrsToDict(fontChild.attributes);

					for (var i = fontChildChildren.length - 1; i >= 0; i--) {
						var toAdd = fontChildChildren[i];

						var newFont = font.cloneNode();
						setAttrs(newFont, attrs);
						newFont.appendChild(toAdd);

						child.insertBefore(newFont, font);
					}

					child.removeChild(font);
					n--;

				}
			}
			else {
				var fontChildren = font.childNodes;
				for (var i = fontChildren.length - 1; i > 0; i--) { // go from end to the second element, and add them after font
					var newFont = font.cloneNode();
					newFont.appendChild(fontChildren[i]);

					child.insertBefore(newFont, font.nextSibling);
				}
				n--;
			}
		}

		// at this point it's divs of fonts or either a br or a text node



		// join fonts with equal attributes
		for (var n = 0; n < fonts.length-1; n++) {
			if (fonts[ n ].childNodes[0].nodeName.toLowerCase() != "#text") continue;
			if (fonts[n+1].childNodes[0].nodeName.toLowerCase() != "#text") continue;


			if (fonts[n].textContent == "") {
				child.removeChild(fonts[n]);
				n--;
				continue;
			}

			if (equalFontAttrs(fonts[n].attributes, fonts[n+1].attributes, true)) {
				if (isStructure) { fonts[n].textContent = "" + (parseInt(fonts[n].textContent) + parseInt(fonts[n+1].textContent)); }
				else { fonts[n].textContent += fonts[n+1].textContent; }

				child.removeChild(fonts[n+1]);
				n--;
			}
		}

		// anything ending in a space must actually end in &nbsp;
		for (var n = 0; n < fonts.length; n++) {
			if (fonts[n].childNodes[0].nodeName.toLowerCase() != "#text") continue;

			var text = fonts[n].textContent;
			if (text.substring(text.length-1) == ' ') {
				text = text.substring(0, text.length-1) + '&nbsp;';
				fonts[n].innerHTML = text;
			}
		}
	}


	for (var i = 0; i < children.length; i++) {
		var child = children[i];


		var fonts = child.childNodes;

		if (fonts.length ==  0) {
			node.removeChild(child);

			i--;
			continue;
		}

		for (var n = 0; n < fonts.length; n++) {
			var font = fonts[n];

			// at a br, we are going to split it into two divs.

			if (font.childNodes.length == 0) { alert("this shouldn't happen sajfoewjf for cntrl f"); continue; }


			if (font.childNodes[0].nodeName.toLowerCase() == "br" && n != fonts.length - 1) {

				var newDiv = document.createElement('div'); // the div that will hold all the fonts that don't have a br

				for (var a = 0; a < n; a++) newDiv.appendChild(child.childNodes[0]);

				child.removeChild(font); // remove the br

				node.insertBefore(newDiv, child); // insert the pure (no brs) div into the node

				if (newDiv.childNodes.length == 0) {
					var nf = document.createElement('font');
					nf.appendChild(document.createElement('br'));
					newDiv.appendChild(nf);
				}
				break; // continue looking at this div. we added the pure div before this one, so no need to n--
			}
		}	
	}

	for (var i = 0; i < children.length; i++) {
		var div = children[i];
		var lastEl = div.childNodes[max(0, div.childNodes.length-1)];

		if (lastEl == undefined || (lastEl.childNodes[0] && lastEl.childNodes[0].nodeName.toLowerCase() != "br")) {
			var newFont = document.createElement('font');
			newFont.color = color;

			var newBr = document.createElement('br');

			newFont.appendChild(newBr);

			div.appendChild(newFont);
		}

		if (div.childNodes.length == 1 && isStructure) {
			var newFont = document.createElement('font');
			newFont.color = color;
			newFont.textContent = "0";

			div.insertBefore(newFont, div.childNodes[0]);

		}
	}
}

if (typeof exports != "undefined") exports.form = form;
if (typeof exports != "undefined") exports.form2 = form2;


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
	return [maxIndex, maxLength];
	
}

function nodeTree(node, color, keepAttrs, returnAsText, isStructure) {
	var first = node.textContent.slice();
	
	var tree = nodeTreeTesting(node, keepAttrs, isStructure);

	
	var second = node.textContent.slice();
	
	if (first != second) {
		alert("went from " + first + " to " + second);
	}
	return returnAsText ? tree.outerHTML : tree;
}

if (typeof exports != "undefined") exports.nodeTree = nodeTree;

function nodeTreeTesting(node, keepAttrs, isStructure) {
	
	var children = node.childNodes;
	var clone = node.cloneNode();
	
	
	var currentTextNodeChain = [-1, 0]; // start, length
	for (var i = 0; i < children.length; i++) {
		
		var child = children[i];
		
		if (child.nodeName == "#text") {
			if  (currentTextNodeChain[0] == -1) {
				currentTextNodeChain = [i, 0];
			}
			
			currentTextNodeChain[1]++; // when we run into textNodes in a row, keep track of the length
		}
		else {
			if (currentTextNodeChain[0] != -1) {
				if (currentTextNodeChain[1] > 1) {
					var textNodes = [];
					
					
					var start = currentTextNodeChain[0], end = currentTextNodeChain[0] + currentTextNodeChain[1];
					var startNode = node.childNodes[start];
					for (var n = start + 1; n < end; n++) {
						textNodes.push(node.removeChild(node.childNodes[start+1])); // will remove the node at start for length times
					}
					
					var text = "";
					for (var n = 0; n < textNodes.length; n++) text += textNodes[n].textContent;
					
					startNode.textContent += text;
					
					if (isStructure) { clone.appendChild(document.createTextNode("" + startNode.textContent)); }
					else { clone.appendChild(document.createTextNode("" + startNode.textContent.length)); }
					
					i = start + 1;
				}
				else {
					if (isStructure) { clone.appendChild(document.createTextNode("" + node.childNodes[currentTextNodeChain[0]].textContent)); }
					else { clone.appendChild(document.createTextNode("" + node.childNodes[currentTextNodeChain[0]].textContent.length)); }
					
				}
				currentTextNodeChain = [-1, 0];
			}
			
			if (child.childNodes.length == 0) {
				var clone2 = child.cloneNode();
				if (!keepAttrs) removeAllAttrs(clone2);
				clone.appendChild(clone2);
			}
			else {
				clone.appendChild(nodeTreeTesting(child, keepAttrs, false));
			}
		}
	}
	
	
	if (currentTextNodeChain[0] != -1) {
		if (currentTextNodeChain[1] > 1) {
			var textNodes = [];
			
			
			var start = currentTextNodeChain[0], end = currentTextNodeChain[0] + currentTextNodeChain[1];
			var startNode = node.childNodes[start];
			for (var n = start + 1; n < end; n++) {
				textNodes.push(node.removeChild(node.childNodes[start+1])); // will remove the node at start for length times
			}
			
			var text = "";
			for (var n = 0; n < textNodes.length; n++) text += textNodes[n].textContent;
			
			startNode.textContent += text;
			
			if (isStructure) { clone.appendChild(document.createTextNode("" + startNode.textContent)); }
			else { clone.appendChild(document.createTextNode("" + startNode.textContent.length)); }
			
			i = start + 1;
		}
		else {
			if (isStructure) { clone.appendChild(document.createTextNode("" + node.childNodes[currentTextNodeChain[0]].textContent)); }
			else { clone.appendChild(document.createTextNode("" + node.childNodes[currentTextNodeChain[0]].textContent.length)); }
		}
		currentTextNodeChain = [-1, 0];

	}

	
	if (!keepAttrs) removeAllAttrs(clone);
	return clone;
}


function createNodeTree(tree) {
	if (tree == undefined || tree == null) return document.createTextNode("");
	
	var div = document.createElement("div");
	
	div.innerHTML = tree;
	
	return div.childNodes[0];
}

if (typeof exports != "undefined") exports.createNodeTree = createNodeTree;

function equalAttrs(attrs1, attrs2, ignoreID) {
	if (attrs1 == undefined || attrs2 == undefined) return attrs1 == attrs2;
	
	var boost1 = 0, boost2 = 0;
	if (ignoreID) {
		if (!attrs1['id']) boost1++;
		if (!attrs2['id']) boost2++;
	}

	if (attrs1.length + boost1 != attrs2.length + boost2) return false;
	
	for (var i = 0; i < attrs1.length; i++) {
		var key = attrs1[i].name;
		if (attrs1[key].name == 'id' && ignoreID) continue;

		if (attrs2[key] == undefined || attrs2[key] == null) return false;

		if (attrs1[key].value != attrs2[key].value) return false;
	}
	
	return true;
}

function equalFontAttrs(attrs1, attrs2, ignoreID) {
	if (attrs1 == undefined || attrs2 == undefined) return attrs1 == attrs2;
	
	var boost1 = 0, boost2 = 0;

	if (!attrs1['style']) boost1++;
	if (!attrs2['style']) boost2++;

	if (ignoreID) {
		if (!attrs1['id']) boost1++;
		if (!attrs2['id']) boost2++;
	}

	if (attrs1.length + boost1 != attrs2.length + boost2) return false;
	
	for (var i = 0; i < attrs1.length; i++) {
		var key = attrs1[i].name;

		if (key == 'style') continue;

		if (attrs1[key].name == 'id' && ignoreID) continue;

		if (attrs2[key] == undefined || attrs2[key] == null) return false;

		if (attrs1[key].value != attrs2[key].value) return false;
	}
	
	return true;
}


function nodeTreesAreEqual(nodeTree1, nodeTree2) { // comparing two nodeTrees
	if (nodeTree1 == undefined || nodeTree2 == undefined) return nodeTree2 == nodeTree1;

	if (nodeTree1.nodeName.toLowerCase() != nodeTree2.nodeName.toLowerCase()) return false;
	//console.log('1');
	if (nodeTree1.nodeName.toLowerCase() == '#text') {
		return nodeTree1.textContent == nodeTree2.textContent;
	}
	//console.log('2');
	if (  !equalFontAttrs(nodeTree1.attributes, nodeTree2.attributes, true) ) return false;
	//console.log('3');


	//if (nodeTree1.childNodes.length != nodeTree2.childNodes.length) return false;

	for (var i1 = 0, i2 = 0; i1 < nodeTree1.childNodes.length && i2 < nodeTree2.childNodes.length; i1++, i2++) {
		
		var child1 = nodeTree1.childNodes[i1];
		var child2 = nodeTree2.childNodes[i2];

		if (child1.nodeName.toLowerCase() == "font" && child1.textContent == "0") {
			i2--;
			continue;
		}

		if (child2.nodeName.toLowerCase() == "font" && child2.textContent == "0") {
			i1--;
			continue;
		}

		if (!nodeTreesAreEqual(child1, child2)) {
			//console.log(child1, child2);
			return false;
		}
	}
	
	if (i1 != nodeTree1.childNodes.length || i2 != nodeTree2.childNodes.length)  {
		//console.log((i1 , nodeTree1.childNodes.length, i2, nodeTree2.childNodes.length));
		return false;
	}

	return true;
	
}




function isDifferent(node, nodeTree) { // comparing nodes to NodeTrees
	if (node == undefined || nodeTree == undefined) return nodeTree != node;
	
	if (node.nodeName.toLowerCase() != nodeTree.nodeName.toLowerCase()) return true;
	
	if (node.nodeName.toLowerCase() == '#text') {
		return parseInt(nodeTree.textContent) != node.textContent.length;
	}
	
	if ( !equalAttrs(node.attributes, nodeTree.attributes) ) return true;
	
	if (node.childNodes.length != nodeTree.childNodes.length) return true;
	
	for (var i = 0; i < node.childNodes.length; i++) {
		
		if (isDifferent(node.childNodes[i], nodeTree.childNodes[i])) return true;
	}
	
	return false;
	
}


function structureDifferences(node, nodeTree, soFar) {
	soFar = soFar || [];
	
	var count = 0, diffNode;

	if (isDifferent(node, nodeTree)) {

		if (node == undefined || nodeTree == undefined) return [soFar, nodeTree];
		
		if (node.childNodes.length != nodeTree.childNodes.length) return [soFar, nodeTree];
		
		if (node.childNodes.length == 0) return [soFar, nodeTree];

		if (node.nodeName.toLowerCase() != nodeTree.nodeName.toLowerCase()) return [soFar, nodeTree];

		if ( !equalAttrs(node.attributes, nodeTree.attributes) ) return [soFar, nodeTree];
		
		for (var i = 0; i < node.childNodes.length; i++) {
			if (isDifferent(node.childNodes[i], nodeTree.childNodes[i])) { count++; diffNode = i; }
			
			if (count > 1) return [soFar, nodeTree];
		}
		
		soFar.push(diffNode);
		return structureDifferences(node.childNodes[diffNode], nodeTree.childNodes[diffNode], soFar);
		
		
	}
	else {
		// this shouldn't happen
		// idk what to do
		// just return nothing I guess

		// actually, this happens when the text changes, but the strucure doesn't
		return;
	}
}

function setStructureDifferences(struct, differences) {


	var path = differences[0];
	var newNodeTree = differences[1];
	
	if (path.length == 0) {
		struct.innerHTML = newNodeTree.innerHTML;
		return;
	}
	
	for (var i = 0; i < path.length; i++) {
		struct = struct.childNodes[path[i]];
	}
	
	struct.parentNode.replaceChild(newNodeTree, struct);

}

if (typeof exports != "undefined") exports.applyStructuralChanges = setStructureDifferences;

function getAttrs(el) {
	var attrs = {};
	if (!el.attributes) return attrs;
	for (var n = 0; n < el.attributes.length; n++) {
		attr = el.attributes[n];
		attrs[attr.name] = attr.value;
	}
	return attrs;
}

function removeAllAttrs(element) {
	if (!element) return;
	if (!element.attributes) return;
	for (var i= element.attributes.length; i-->0;)
		element.removeAttributeNode(element.attributes[i]);
}

function structuralDifference(structure1, structure2, soFar, differences, length) {
	
	var children1 = structure1.childNodes;
	var children2 = structure2.childNodes;

	soFar = soFar || [];
	differences = differences || [];
	length = length || 0;
	
	
	for (var i1 = 0, i2 = 0; i1 < children1.length && i2 < children2.length; i1++, i2++) {
		var child1 = children1[i1];
		var child2 = children2[i2];
		
		var attrs = getAttrs(child2);

		var pre = soFar.join("-");
		if (soFar.length != 0) pre += "-";
			
		var mathcingId = child2.id != prefix + pre + i2;

		if (child2.nodeName.toLowerCase() == "#text" && child1.nodeName.toLowerCase() == "#text") {
			if (child2.textContent != child1.textContent) {
				var diff = parseInt(child2.textContent) - parseInt(child1.textContent);
				differences.push(['cl', soFar, i2, diff]);
			}
		}
		else if (child2.nodeName.toLowerCase() != "#text" && child1.nodeName.toLowerCase() != "#text") {
			differences.push(['dd', soFar, i2]);
			differences.push(['ad', soFar, max(0, i2-1), child2.nodeName.toLowerCase(), nodeTree(child2, true), attrs]);
		}
		else if (child2.nodeName.toLowerCase() == "#text") {
			differences.push(['dd', soFar, i2]);
			differences.push(['ad', soFar, max(0, i2-1), "", nodeTree(child2, true), attrs]);
		}
		else { // child1 is a text node
			differences.push(['dd', soFar, i2]);
			differences.push(['ad', soFar, max(0, i2-1), child2.nodeName.toLowerCase(), nodeTree(child2, true), attrs]);
		}
		
		length += child2.textContent.length;
	}
	
	var deleted = 0;
	//console.log("diff: " + (children1.length - children2.length));
	for (; i1 < children1.length; i1++) {
		
		soFar = soFar.slice();
		
		differences.push(['dd', soFar, (children1.length-1)-deleted]);
		
		deleted++;
	}
	var offset = 0, last = 0;
	soFar = soFar.slice();
	soFar[soFar.length-1]--;
	
	
	for (; i2 < children2.length; i2++) {
		
		soFar = soFar.slice();
		soFar[soFar.length-1]++;
		
		var child2 = children2[i2];
		
		
		if (children2[i2].nodeName != "#text") {
			differences.push(['ad', soFar, max(0, i2-1), child2.nodeName.toLowerCase(), nodeTree(child2, true), getAttrs(child2)]);
		}
		else {
			differences.push(['ad', soFar, max(0, i2-1), "", nodeTree(child2, true), getAttrs(child2)]);
		}
		
		offset++;
		last = length;
		
		length += children2[i2].textContent.length;
	}
	
	return differences;
}

function getText(node) {
	var divs = node.childNodes;
	var text = "";
	for (var i = 0 ; i < divs.length; i++) {
		text += divs[i].textContent;
		if (i != divs.length-1) text += "\n";
	}
	return text;
}

function nodeAt(pos, node, isStructure) {
	var len = pos;

	var children = $('#testArea')[0].childNodes;
	if (node) children = node.childNodes;

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

function _applyNewLineToStructure(structure, position, color, isPost) {
	var node = nodeAt(position, structure, true);
	if (!node && isPost) {
		node = nodeAt(position-1, structure, true);
		node[1]++;
	}
	if (node) {
		var font = node[0].parentNode;

		var div = node[0].parentNode.parentNode;

		var aboveFonts = [], belowFonts = [];

		var leftSide = node[1];
		var rightSide = parseInt(node[0].textContent) - leftSide;

		node[0].textContent = "" + leftSide;
		if (leftSide == 0) {
			//font.appendChild(document.createElement('br'));
		}

		var right = font.cloneNode();
		right.textContent = rightSide;

		belowFonts.push(right);

		var after = node[0].nextSibling;
		while (after) {
			belowFonts.push(after);

			var next = after.nextSibling;

			node[0].parentNode.removeChild(after);

			after = next;
		}

		var newDiv = document.createElement('div');
		for (var i = 0; i < belowFonts.length; i++) {
			newDiv.appendChild(belowFonts[i]);
		}

		var newFont = document.createElement('font');
		newFont.color = color;

		var newBr = document.createElement('br');

		newFont.appendChild(newBr);

		newDiv.appendChild(newFont);

		var parentDiv = div.parentNode;

		parentDiv.insertBefore(newDiv, div.nextSibling);
	}
	else {
		console.warn("nodeAt returned null for structure:");
		console.warn(structure);
		console.warn("and new line position " + position);
	}
}


function _removeNewLineFromStructure(structure, position) {

	var removing = nodeAt(position, structure, true);

	if (removing[1] != parseInt(removing[0].textContent)) {
		console.warn("removing a newline, but the position we got isn't the end of a node");
		console.warn(removing[0], removing[1]);
	}

	var toJoin1 = removing[0].parentNode.parentNode, toJoin2 = removing[0].parentNode.parentNode.nextSibling;

	console.log(strip(toJoin1), strip(toJoin2));

	var children1 = toJoin1.childNodes;
	toJoin1.removeChild(children1[children1.length - 1]); // remove the br at the end of every div

	var children2 = toJoin2.childNodes;
	for (var i = 0; i < children2.length; i++) {
		toJoin1.appendChild(toJoin2.removeChild(children2[i]));
	}

	toJoin2.parentNode.removeChild(toJoin2);
}

function _applyAdditionToStructure(structure, originalText, addition, color, isPost) {

	addition = addition.slice();

	var newLineCount = 0;
	for (var i = 0; i < addition[0]; i++) {
		if (originalText.charAt(i) == '\n') newLineCount++;
	}

	addition[0] -= newLineCount;

	var textAdditions = addition[1].split('\n'), additions = [];

	var offset = 0;
	for (var i = 0; i < textAdditions.length; i++) {
		additions.push([addition[0] + offset, textAdditions[i]]);
		offset += textAdditions[i].length;
	}

	for (var i = 0; i < additions.length; i++) {

		addition = additions[i];

		if (i != 0) {
			_applyNewLineToStructure(structure, addition[0], color, isPost);
		}

		var node = nodeAt(addition[0], structure, true);
		if (!node && isPost) {
			node = nodeAt(addition[0]-1, structure, true);
		}
		if (node) {
			var positionInNode = node[1];
			node = node[0];

			var parentNode = node.parentNode;

			console.log('adding after "' + originalText.charAt(addition[0] + newLineCount - 1) + '"');


			console.log(addition[0], strip(structure));
			console.log(nodeAt(addition[0], structure, true));
			console.log(nodeAt(addition[0]-1, structure, true));
			if (positionInNode == parseInt(node.textContent)) {
				var movedAhead = 0;
				while (originalText.charAt(addition[0] + newLineCount - 1 + movedAhead) == '\n') {
					console.log("going forwar from ", strip(node));
					node = nextTextNode(node) || node;
					console.log("to ", strip(node));
					console.log(originalText.substring(addition[0] + newLineCount -1 +movedAhead));
					movedAhead--;
				}
				console.log(originalText.charAt(addition[0] + newLineCount - 1 + movedAhead));
			}
			else { console.log('efasdf")', isPost, positionInNode); }


			if (color != parentNode.color) {
				var nodeLength = parseInt(node.textContent);

				var leftSide = positionInNode;
				var rightSide = nodeLength - leftSide;
				var middle = addition[1].length;


				node.textContent = "" + leftSide;
				
				var middleFont = document.createElement('font');
				middleFont.color = color;
				middleFont.textContent = "" + middle;

				var rightFont = document.createElement('font');
				rightFont.color = parentNode.color;
				rightFont.textContent = "" + rightSide;

				parentNode.insertBefore(rightFont, node.nextSibling);
				parentNode.insertBefore(middleFont, node.nextSibling);

			}
			else { 
				node.textContent = "" + (parseInt(node.textContent) + addition[1].length);

			}

		}
		else {
			console.warn("nodeAt returned null for structure:");
			console.warn(structure);
			console.warn("and addition");
			console.warn(addition);
		}
	}
}

function _applyDeletionToStructure(structure, originalText, originalTextOffset, deletion, color, isPost) {

	console.log(strip(structure));
	deletion = deletion.slice();
	var newLineCount = 0;
	for (var i = 0; i < deletion[0]; i++) {
		if (originalText.charAt(i) == '\n') newLineCount++;
	}

	var deleting = originalText.substring(deletion[0] - originalTextOffset, (deletion[0] - originalTextOffset) + deletion[1])
	var textDeletions = deleting.split('\n'), deletions = [];

	for (var i = 0; i < textDeletions.length; i++) {
		deletions.push([deletion[0], textDeletions[i].length]);
	}

	
	var offset = 0;
	for (var i = 0; i < deletions.length; i++) {

		var deletion = deletions[i];
		//console.log("deleting " + JSON.stringify(deletion));
		var deleting = originalText.substring(deletion[0] - originalTextOffset, (deletion[0] - originalTextOffset) + deletion[1]);
		//console.log("deleting text" + deleting);

		if (i != 0) {
			//console.log("removing newLine");
			_removeNewLineFromStructure(structure, deletions[i-1][0] - newLineCount);
			//console.log("finshed removing newLine");
		}

		var node = nodeAt(deletion[0] - newLineCount, structure, true);
		var toDelete = deletion[1];


		console.log("deleting", deletion, node[0], node[1]);
		var positionInNode;
		if (node) {
			positionInNode = node[1];
			node = node[0];
		}

		offset += toDelete;

		while (toDelete > 0) {
			if (node) {
				console.log(strip(node));
				var nodeAmount = parseInt(node.textContent) - positionInNode;

				if (nodeAmount > toDelete) {
					node.textContent =  "" + (positionInNode + (nodeAmount - toDelete));
					toDelete = 0;
				}
				else {
					toDelete -= nodeAmount;
					node.textContent = "" + positionInNode;
					var next = nextTextNode(node, structure);

					// if (node.textContent == "0") {
					// 	node.parentNode.removeChild(node);
					// }

					node = next;
				}

				positionInNode = 0;
			}
			else {
				console.warn("nodeAt returned null for structure:");
				console.warn(structure);
				console.warn("and deletion");
				console.warn(deletion);
				break;
			}
		}
	}
	
}

function applyTextChangesToStructure(structure, originalText, textChanges_, color) {
	var isPost = textChanges_[textChanges_.length - 1];


	var originalTextOffset = 0;
	for (var i = 0; i < textChanges_.length - 1; i++) {
		var textChange_ = textChanges_[i];

		if (textChange_.length == 2){
			if (typeof textChange_[1] == "string") {
				_applyAdditionToStructure(structure, originalText, textChange_, color, isPost && i == textChanges_.length - 2);
				originalTextOffset += textChange_[1].length;
			}
			else {
				_applyDeletionToStructure(structure, originalText, originalTextOffset, textChange_, color, isPost && i == textChanges_.length - 2);
				originalTextOffset -= textChange_[1];
			}
		}
		else {
			_applyDeletionToStructure(structure, originalText, originalTextOffset, [textChange_[0], textChange_[2]], color);
			_applyAdditionToStructure(structure, originalText, [textChange_[0], textChange_[1]], color);

			originalTextOffset += textChange_[1].length - textChange_[2];
		}
	}
}

function getNodeChanges(node1, node2, cursor) {
	var node1 = node1 || $('#section1')[0];
	var node2 = node2 || $('#section2')[0];
	


	var sd = structureDifferences(node1, nodeTree(node2, true, false));
	
	//console.log(node1);
	//console.log("node2 tree: " + nodeTree(node2, true, false).outerHTML);
	
	var textChanges_ = changes(node1, node2);

	var textContent = node2.textContent, textContentLength = textContent.length;

	if (cursor) {
		for (var i = 0; i < textChanges_.length; i++) {
			var textChange = textChanges_[i];

			if (textChange.length == 2 && typeof textChange[1] == "string") {

				var incrs = [-textChange[1].length, textChange[1].length];

				var range = [];
				for (var n = 0; n < incrs.length; n++) {
					var incr = incrs[n];

					for (var pos = textChange[0]; true; pos += incr) {

						if (pos < 0 || pos >= textContentLength) {
							range.push(pos - incr);
							break;
						}

						var str = textContent.substring(pos, pos + textChange[1].length);

						if (str != textChange[1] ) {
							range.push(pos - incr);
							break;
						}
					}
				}
				range.push(i);

				if (range[0] != range[1]) {
					var c = cursor[0][0] - 1;
					if (c >= range[0] && c <= range[1]) {
						if (range[2] == textChanges_.length - 2) {
							textChanges_[textChanges_.length - 1] = c == textContentLength - 1 ? 1 : 0;
						}
						textChange[0] = c;

					}
				}
			}
		}
	}
	
	if (sd) sd[1] = sd[1].outerHTML || sd[1].textContent;
	
	var toColor = nodesToColorize(node2, textChanges_);
	
	return [sd, textChanges_, toColor];
}

function setNodeChanges(node, oldStruct, changes, colr, doc) {
	
	oldStruct[1] = createNodeTree(oldStruct[1]);
	
	stopAt = node;
	
	if (doc) {
		document = doc;
		// workaround so we can access a document in node.js
	}
	
	color = colr || "purple";
	
	var oldText = node.textContent;
	var differences = changes[0];
	
	differences[1] = createNodeTree(differences[1]);
	
	var textChanges_ = changes[1];
	
	setStructureDifferences(oldStruct, differences); //oldStruct was changed by this function
	var newStruct = oldStruct; // for clarity.

	var newText = executeChanges(oldText, textChanges_)
	setText(node, newStruct, newText);
	
	colorize(node, textChanges_);
	form(node);
}

if (typeof exports != 'undefined') exports.applyChanges = setNodeChanges;

function structureLength(struct) {
	if (struct.nodeName.toLowerCase() == "#text") return parseInt(struct.textContent);
	
	var len = 0;

	var children = struct.childNodes;
	for (var i = 0; i < children.length; i++) {
		
		var child = children[i];
		
		if (child.nodeName.toLowerCase() == "#text") { len += parseInt(child.textContent); }
		else { len += structureLength(child); }
		
	}
	return len;
}

function setText(node, structure, text, offset) {

	text = text.replace(/\n/g, '');
	
	if (typeof structure == "string") structure = createNodeTree(structure);
	
	offset = offset || 0;
	
	
	var pos = 0;
	var children = structure.childNodes;
	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		
		
		var childToChange = node.childNodes[i];
		
		if (child.nodeName.toLowerCase() == "#text") {
			
			var len = structureLength(child);
			
			childToChange.textContent = text.substring(pos, pos+len);
			pos += len;
		}
		else {
			pos += setText(childToChange, child, text.substring(pos, pos+structureLength(child)));
		}
	}
	
	return pos;
}



function merge(part1, part2) { // assumes they can be merged
	var copy = part1.slice();
	
	if (part1.length == 3) { // its a replacement
		if (part2.length == 3) {
			copy[1] += part2[1];
			copy[2] += part2[2];
		}
		else if (typeof part2[1] == "string") {
			copy[1] += part2[1];
			
		}
		else {
			copy[2] += part2[1];
		}
		
	}
	else if (typeof part1[1] == "string") {
		if (part2.length == 3) {
			copy = [part1[0], part1[1] + part2[1], part2[2]];
		}
		else if (typeof part2[1] == "string") {
			copy[1] += part2[1];
		}
		else {
			copy = [part1[0], part1[1], part2[1] + part1[1].length];
		}
	}
	else {
		if (part2.length == 3) {
			copy = [part1[0], part2[1], part1[1]];
		}
		else if (typeof part2 == "string"){
			copy = [part1[0], part1[1], part2[1]];
		}
		else {
			copy = [part1[0], part2[1], part1[1]];
		}
	}
	
	return copy;
}


function groupChanges(changes) {
	changes = changes.slice(); // TODO maybe make this in place. Easy to do, but may effect other functions that still have a reference
	var offset = 0;
	var last = -10000;
	for (var i = 0; i < changes.length; i++) {
		var change = changes[i];
		
		
		
		if (change[0] + offset == last+1) {
			if ( !isDeletion(changes[i-1]) ) {
				
				changes.splice(i-1, 2, merge(changes[i-1], change));
			}
			i--;
		}
		last = change[0];
		
		
		if (change.length == 3) { // replacement
			
			
			offset += change[1].length;
			offset -= change[2];
		}
		else if (typeof change[1] == "string") { // addition
			
			
			offset += change[1].length;
		}
		else { // deletion
			
			offset -= change[1];
		}
	}
	return changes;
}




function changes(parent1, parent2) {
	var changes = [];
	
	var nodes1 = parent1.childNodes;
	var text1 = nodes1.length == 0 ? "" : getText(parent1);
	
	var nodes2 = parent2.childNodes;
	var text2 = nodes2.length == 0 ? "" : getText(parent2);

	changes = textChanges(text1, text2);
	
	return changes;
}



function textChanges(val1, val2) {
	var changes = [];

	for (var pos1 = val1.length-1, pos2 = val2.length-1; pos1 >= 0 && pos2 >= 0; pos1--, pos2--) {
		if (val1.charAt(pos1) != val2.charAt(pos2)) break;
	}

	val1 = val1.substring(0, pos1+1);
	val2 = val2.substring(0, pos2+1);

	for (var pos1 = 0, pos2 = 0; pos1 < val1.length && pos2 < val2.length;) {
		
		var ch1 = val1[pos1];
		var ch2 = val2[pos2];
		
		if (ch1 != ch2) {
			var addition = findContinuation(val1, pos1, val2, pos2+1);
			
			var deletion = findContinuation(val2, pos2, val1, pos1+1);
			
			if (addition[1] > deletion[1]) { // additions
				var stuff = addition;
				
				var length = stuff[0] - pos2; // length of addition
				
				changes.push([pos1, val2.substring(stuff[0]-length, stuff[0])]);
				
				pos2 += length;
				continue;
			}
			else if (addition[1] < deletion[1]) {
				var stuff = deletion;
				
				var length = stuff[0] - pos1; // length of deletion
				
				changes.push([pos1, length]);
				
				pos1 += length;
				continue;
			}
			else if (addition[1] == deletion[1]) {
				changes.push([pos1, val2[pos2], 1]);
			}

			
		}
		pos1++;
		pos2++;
	}
	


	var isPost;
	if (pos1 != val1.length) {
		var post = [val2.length, val1.length - pos1];
		changes.push(post);
		isPost = 1;;
	}
	else if (pos2 < val2.length) {
		var post = [pos2, val2.substring(pos2)];
		changes.push(post);
		isPost = 1;;
	}
	else {
		isPost = 0;
	}
	
	
	//console.log(JSON.stringify(changes));
	
	changes = groupChanges(changes);
	changes.push(isPost);
	
	//console.log("--------------------------------------- Compressing ---------------------------------------------------");
	//console.log(JSON.stringify(changes));
	
	
	return changes;

	
	
}

function check(changes) {
	val1 = document.getElementById("section1").childNodes[0].parentNode.textContent;
	val2 = document.getElementById("section2").childNodes[0].parentNode.textContent;
	
	val1 = executeChanges(val1, changes);
	
	return val1 == val2;
}


function executeChanges(val, changes) {
	var offset = 0;
	for (var i = 0; i < changes.length - 1; i++) {
		
		var change = changes[i];
		
		if (i == changes.length - 2 && changes[changes.length-1]) offset = 0;
		
		if (change.length == 3) { // replacement
			change[0] += offset;
			
			
			val = val.substring(0, change[0]) + change[1] + val.substring(change[0] + change[2]);
			
			offset += change[1].length;
			offset -= change[2];
		}
		else if (typeof change[1] == "string") { // addition
			change[0] += offset;
			
			val = val.substring(0, change[0]) + change[1] + val.substring(change[0]);
			
			offset += change[1].length;
		}
		else {
			change[0] += offset;
			
			val = val.substring(0, change[0]) + val.substring(change[0] + change[1]);
			
			offset -= change[1];
		}
	}
	
	return val;
}

if (typeof exports != "undefined") { exports.applyTextChanges = executeChanges; }

function executeNodeChanges(section1, changes) {
	
	var differences = changes;
	
	for (var i = 0; i < differences.length; i++) {
		var difference = differences[i];
		var node = section1, parent = section1;
		for (var n = 0; n < difference[1].length; n++) {
			node = node.childNodes[difference[1][n]];
			parent = node;
		}
		
		
		if (difference[0] == 'dd') { //delete div
			
			var removed = parent.removeChild(parent.childNodes[difference[2]]);
			//console.log((removed.innerHTML || removed.textContent) + " removed");
		}
		
		if (difference[0] == 'ad') { // add div
			
			var toAdd = createNodeTree(difference[4]);
			
			var attrs = difference[5];
			
			for (var key in attrs) {
				toAdd.setAttribute(key, attrs[key]);
			}

			if (parent.childNodes.length == 0) {
				parent.appendChild(toAdd);
			}
			else {
				parent.insertBefore(toAdd, parent.childNodes[difference[2]].nextSibling);
			}
			node = toAdd;
		}
		
		var id = parent;
		if (id == section1) {
			id = prefix;
		}
		else {
			id = parent.id;
		}
		

		for (var n = 0; n < parent.childNodes.length; n++) {
			var child = parent.childNodes[n];
			
			if (child.childNodes.length != 0) {
				child.id = id + '-' + n;
			}
		}
	}
}

function nodesToColorize(node, changes) {
	
	var toColor = toColorize(changes);

	//console.log('toColor: ' + JSON.stringify(toColor));
	
	var nodes = [];
	for (var i = 0; i < toColor.length; i++) {
		var toC = toColor[i];
		//console.log(node.textContent.substring(toC[0], toC[0] + toC[1]));
		var ns = nodesToColorizeHelper(node, [toC[0], toC[0] + toC[1]]);
		//console.log(ns);
		
		nodes.push.apply(nodes, ns);
	}
	
	return nodes;
}

function nodesToColorizeHelper(node, range, len, nodesInRange, soFar) { // returns the nodes with the ranges relative to said nodes to colorize
	
	soFar = soFar || [];
	nodesInRange = nodesInRange || [];
	len = len || 0;
	
	
	if (node.nodeName.toLowerCase() != "#text") {
		
		//console.log(node);
		for (var i = 0; i < node.childNodes.length; i++) {
			
			var soFarC = soFar.slice();
			soFarC.push(i);
			
			nodesToColorizeHelper(node.childNodes[i], range, len, nodesInRange, soFarC);
			
			len += node.childNodes[i].textContent.length;
		}
		
		return nodesInRange;
	}
	
	var theColor = color || "#0000ff";
	
	if ( (range[0] >= len && range[0] < len + node.textContent.length) || (range[1] > len && range[1] <= len + node.textContent.length) ) {
		
		if (getColor(node) != theColor) {
			var repr = [0, [max(0, range[0] - len), min(node.textContent.length, range[1] - range[0])], soFar];
			nodesInRange.push(repr);
		}
		
	}
	else {
	}
	return nodesInRange;
}


function toColorize(changes) { // returns the ranges to colorize
	var isPost = changes[changes.length-1];
	changes = changes.slice(0, changes.length-1);
	
	var offset = 0;
	for (var i = 0; i < changes.length; ) {
		if (i == changes.length - 1 && isPost) offset = 0;

		if (isDeletion(changes[i])) {
			offset -= changes[i][1];
			
			changes.splice(i, 1);
		}
		else if (isReplacement(changes[i])) {
			var addition = [changes[i][0] + offset, changes[i][1].length];
			
			offset -= changes[i][2];
			offset += changes[i][1].length;
			
			changes.splice(i, 1, addition);
			
			i++;
		}
		else {
			var addition = [changes[i][0] + offset, changes[i][1].length];
			changes.splice(i, 1, addition);
			
			offset += changes[i][1];
			
			i++;
		}
	}
	
	return changes;
}

function colorize(node, changes, col) {
	
	var nodes = nodesToColorize(node, changes);
	
	var theColor = col || color || "black";

	for (var i = 0; i < nodes.length; i++) {
		toColor = nodes[i];
		
		var location = toColor[2];
		
		for (var n = 0; n < location.length; n++) {
			node = node.childNodes[location[n]];
		}
		
		toColor[0] = node;
	}
	

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i][0];
		var range = nodes[i][1];

		//console.log(node.outerHTML || node.textContent, JSON.stringify(range));
		
		if (getColor(node) != theColor) {
			var text = node.textContent;
			
			var part1 = text.substring(0, range[0]);
			var part2 = text.substring(range[0], range[0] + range[1]);
			var part3 = text.substring(range[0] + range[1]);
			
			var parent = node.parentNode;
			if (part1 != "") parent.insertBefore(document.createTextNode(part1), node);
			
			
			var font = document.createElement("font");
			font.color = theColor;
			font.appendChild( document.createTextNode(part2) );
			parent.insertBefore(font, node);
			
			if (part3 != "") parent.insertBefore(document.createTextNode(part3), node);
			
			parent.removeChild(node);
		}
		else {  }
	}
	
	return nodes;
}


function colorizeStructure(nodesToColor, structure, Color) {
	
	for (var i = 0; i < nodesToColor.length; i++) {
		toColor = nodesToColor[i];
		
		var location = toColor[2];
		
		var node = structure;
		
		for (var n = 0; n < location.length; n++) {
			node = node.childNodes[location[n]];
		}
		
		toColor[0] = node;
	}
	
	var nodes = nodesToColor;
	var theColor = Color || color || "blue";
	
	//console.log("colorizing " + nodes.length + " nodes");
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i][0];
		var range = nodes[i][1];
		
		var parent = node.parentNode;
		
		var textLength = parseInt(node.textContent);
		

		if (range[0] != 0) parent.insertBefore(document.createTextNode("" + range[0]), node);
		
		var font = document.createElement("font");
		font.color = theColor;
		font.appendChild( document.createTextNode("" + range[1]) );
		parent.insertBefore(font, node);
		
		
		var end = range[0] + range[1];
		if (end < textLength) parent.insertBefore(document.createTextNode("" + (textLength - end)), node);
		
		parent.removeChild(node);
	}
}



if (typeof exports != "undefined") exports.colorizeStructure = colorizeStructure;