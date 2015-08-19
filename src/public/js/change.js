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

function form2(node, color, className, isStructure, cursor) {
	var children = node.childNodes;


	var newHTML = node.innerHTML.replace(/\n/g, '');

	if (newHTML != node.innerHTML) {
		node.innerHTML = newHTML;
		if (cursor) {
			try {
				setCursor3(cursor);
			}
			catch (e) {
				alert(e);
			}
		}
	}

	if (children.length == 0) {
		node.appendChild(blankState(color, className, isStructure));
		return;
	}

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


			if (n > 0 || fonts.length > 2) {

				if (font.childNodes.length == 0) {
					child.removeChild(font);
					n--;
					continue;	
				}

				if (isStructure && font.childNodes[0].textContent == "0") {
					if (fonts.length <= 2) {
						if (fonts.length == 2 && fonts[1].childNodes[0] && fonts[1].childNodes[0].nodeName.toLowerCase() != 'br') {
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
			}


			if (font.childNodes.length == 1 && font.childNodes[0].nodeName.toLowerCase() == "#text") {
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
			}

			if (font.childNodes.length == 0) {
				if (fonts.length == 1) {
					font.appendChild(document.createElement('br'));
				}
				else {
					if (children.length > 1 && n > 0) {
						child.removeChild(font);
						n--;
					}
				}

			}
			else if (font.childNodes.length == 1){
				var name = font.childNodes[0].nodeName.toLowerCase();

				if (name != "#text" && name != "br") {
					var fontChild = font.childNodes[0], type = fontChild.nodeName.toLowerCase();

					var fontChildChildren = fontChild.childNodes;

					var attrs = AttrsToDict(fontChild.attributes);

					console.log(JSON.stringify(attrs));

					if (name == "i") {
						var style = attrs['style'] || '';
						style = style.replace(/\n/g, '');

						if (style.charAt(style.length-1) != ";" && style.length > 0) style += ";"

						style += 'font-style: italic;';

						attrs['style'] = style;
					}

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
			if (fonts[n].childNodes.length == 0) {
				if (n == 0) {
					continue;
				}
				else {
					child.removeChild(fonts[n]);
					n--;
					continue;
				}
			}

			if (fonts[ n ].childNodes[0].nodeName.toLowerCase() != "#text") continue;
			if (fonts[n+1].childNodes[0].nodeName.toLowerCase() != "#text") continue;


			if (equalFontAttrs(fonts[n].attributes, fonts[n+1].attributes, true)) {
				if (isStructure) { fonts[n].textContent = "" + (parseInt(fonts[n].textContent) + parseInt(fonts[n+1].textContent)); }
				else { fonts[n].textContent += fonts[n+1].textContent; }

				child.removeChild(fonts[n+1]);
				n--;
			}
		}

		// anything ending in a space must actually end in &nbsp;
		for (var n = 0; n < fonts.length; n++) {
			if (fonts[n].childNodes.length == 0) continue;

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

		for (var n = 0; n < fonts.length; n++) {
			var font = fonts[n];

			// at a br, we are going to split it into two divs.

			if (font.childNodes.length == 0) continue;


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

function isInArray(item, array) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] == item) { return true; }
	}
	return false;
}

function stylesAreEqual(style1, style2) {

	style1 = style1 != undefined ? style1.value : '';
	style2 = style2 != undefined ? style2.value : '';

	style1 = style1.split(';');
	style2 = style2.split(';');

	var dict1 = {}, dict2 = {}, styles = [[style1, dict1], [style2, dict2]];


	for (var n = 0; n < styles.length; n++) {
		var style = styles[n][0], dict = styles[n][1];

		for (var i = 0; i < style.length; i++) {
			var str = style[i];
			var pos = str.indexOf(':');

			if (pos == -1) continue;

			dict[str.substring(0, pos)] = str.substring(pos+1);
		}
	}

	var doesntMatter = ['line-height'];

	var keys1 = Object.keys(dict1), keys2 = Object.keys(dict2);

	console.log(dict1, "vs", dict2);
	for (var i1 = 0, i2 = 0; i1 < keys1.length || i2 < keys2.length; ) {
		var key1 = keys1[i1], key2 = keys2[i2];

		if (isInArray(key1, doesntMatter)) {
			i1++;
			console.log('k');
			continue;
		}

		if (isInArray(key2, doesntMatter)) {
			i2++;
			console.log('k');
			continue;
		}

		i1++; i2++;
	}

	if (i1 != keys1.length || i2 != keys2.length) return false;

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

	if (!stylesAreEqual(attrs1['style'], attrs2['style'])) return false
	
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

function strippedNodeTreesAreEqual(nodeTree1, nodeTree2) {
	var children1 = nodeTree1.children;
	var children2 = nodeTree2.children;

	if (children1.length != children2.length) return false;

	for (var i = 0; i < children1.length; i++) {
		var fonts1 = children1[i];
		var fonts2 = children2[i];

		for (var n1 = 0, n2 = 0; n1 < fonts1.childNodes.length - 1 && n2 < fonts2.childNodes.length - 1; n1++, n2++) { //ignore the br at the end
			var font1 = fonts1.childNodes[n1];
			var font2 = fonts2.childNodes[n2];

			if (font1.textContent == "0") {
				n2--;
				continue; //skip this one
			}
			if (font2.textContent == "0") {
				n1--;
				continue;
			}

			if (font1.textContent != font2.textContent) return false;
			if (font1.color != font2.color) return false;
		}
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


function nodeAtStructure(pos, node, isRoot) {
	var len = pos;

	var children;
	if (node) children = node.childNodes;
	else children = $('#testArea')[0].childNodes;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];

		var textLength = structureLength(child); 

		len -= textLength;
		//console.log("len is now", len);

		if (len <= 0) {
			len += textLength;
			
			if (child.nodeName.toLowerCase() == "#text") return [child, len];
			return nodeAtStructure(len, child, false);

		}
		if (isRoot == undefined){ len--; }
	}
}

function _applyNewLineToStructure(structure, position, color, isPost) {
	var node = nodeAtStructure(position, structure);

	//console.log(position + " of ", strip(structure));
	//console.log(" gives us ", strip(node[0]), node[1]);
	if (!node && isPost) {
		console.log("node is null");
		node = nodeAtStructure(position-1, structure);
	}
	if (node) {

		var font = node[0].parentNode;

		var div = node[0].parentNode.parentNode;

		//console.log("splitting ", strip(node[0]), node[1]);

		var aboveFonts = [], belowFonts = [];

		var leftSide = node[1];
		var rightSide = parseInt(node[0].textContent) - leftSide;

		//console.log(leftSide, rightSide);

		node[0].textContent = "" + leftSide;
		if (leftSide == 0) {
			//font.appendChild(document.createElement('br'));
		}

		var right = font.cloneNode();
		right.textContent = rightSide;

		belowFonts.push(right);

		var after = node[0].parentNode.nextSibling;

		while (after) {
			belowFonts.push(after);

			var next = after.nextSibling;

			after.parentNode.removeChild(after);

			after = next;
		}


		var newDiv = document.createElement('div');
		for (var i = 0; i < belowFonts.length - 1; i++) {
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

	var removing = nodeAtStructure(position, structure);

	if (removing[1] != parseInt(removing[0].textContent)) {
		console.warn("removing a newline, but the position we got isn't the end of a node");
		console.warn(removing[0], removing[1]);
	}

	var toJoin1 = removing[0].parentNode.parentNode, toJoin2 = removing[0].parentNode.parentNode.nextSibling;


	var children1 = toJoin1.childNodes;
	var br = toJoin1.removeChild(children1[children1.length - 1]); // remove the br at the end of every div. We'll add it to the end later

	var children2 = toJoin2.childNodes;

	var goingToBeSizeOftoJoin1 = toJoin1.childNodes.length + children2.length;

	while (children2.length > 1) {
		var t = toJoin2.removeChild(children2[0]);

		if (t.childNodes.length == 1 && t.childNodes[0].nodeName.toLowerCase() == "#text" && t.textContent == "0" && goingToBeSizeOftoJoin1 > 2) {
			continue;
		}

		toJoin1.appendChild(t);
	}
	toJoin1.appendChild(br);

	//toJoin1.appendChild(br);

	toJoin2.parentNode.removeChild(toJoin2);
}

function blankState(color, className, isStructure) {
	var newDiv = document.createElement('div');

	var newFont1 = document.createElement('font');
	newFont1.color = color;
	newFont1.textContent = isStructure ? "0" : "";

	var newFont2 = document.createElement('font');
	newFont2.color = color;
	newFont2.className = className;
	newFont2.appendChild(document.createElement('br'));

	newDiv.appendChild(newFont1);
	newDiv.appendChild(newFont2);

	return newDiv;
}

function _applyAdditionToStructure(structure, originalText, addition, color, className, isPost) {

	console.log("class", className);

	if (structure.childNodes.length == 0) {
		structure.appendChild(blankState(color, className, true));
	}

	addition = addition.slice();


	var textAdditions = addition[1].split('\n'), additions = [];

	var offset = 0;
	for (var i = 0; i < textAdditions.length; i++) {
		additions.push([addition[0] + offset, textAdditions[i]]);
		offset += textAdditions[i].length + 1;
	}

	for (var i = 0; i < additions.length; i++) {

		addition = additions[i];

		//console.log(addition);

		if (i != 0) {

			var addedNewLineLastTime = i > 1;
			var lengthExtra = addedNewLineLastTime ? 1 : 0;

			_applyNewLineToStructure(structure, additions[i-1][0] + additions[i-1][1].length - lengthExtra, color, isPost);

			originalText = originalText.substring(0, addition[0]) +  '\n' + originalText.substring(addition[0]);
			addition[0]++;
		}

		var node = nodeAtStructure(addition[0], structure);
		if (!node && isPost) {
			node = nodeAtStructure(addition[0]-1, structure);
		}
		if (node) {
			var positionInNode = node[1];
			node = node[0];

			var parentNode = node.parentNode;


			/*var parentColor = parentNode.color;
			if (color != parentColor) {


				var nodeLength = parseInt(node.textContent);
				var parentNode = node.parentNode.parentNode;

				var leftSide = positionInNode;
				var rightSide = nodeLength - leftSide;
				var middle = addition[1].length;


				node.textContent = "" + leftSide;
				
				var middleFont = document.createElement('font');
				middleFont.color = color;
				middleFont.textContent = "" + middle;

				var rightFont = document.createElement('font');
				rightFont.color = parentColor;
				rightFont.textContent = "" + rightSide;

				parentNode.insertBefore(rightFont, node.parentNode.nextSibling);
				parentNode.insertBefore(middleFont, node.parentNode.nextSibling);
			}
			else { 
				node.textContent = "" + (parseInt(node.textContent) + addition[1].length);

			}*/

			var parentClass = parentNode.className;
			if (color != parentClass) {


				var nodeLength = parseInt(node.textContent);
				var parentNode = node.parentNode.parentNode;

				var leftSide = positionInNode;
				var rightSide = nodeLength - leftSide;
				var middle = addition[1].length;


				node.textContent = "" + leftSide;
				
				var middleFont = document.createElement('font');
				middleFont.className = className;
				middleFont.textContent = "" + middle;

				var rightFont = document.createElement('font');
				rightFont.className = parentClass;
				rightFont.textContent = "" + rightSide;

				parentNode.insertBefore(rightFont, node.parentNode.nextSibling);
				parentNode.insertBefore(middleFont, node.parentNode.nextSibling);
			}
			else { 
				node.textContent = "" + (parseInt(node.textContent) + addition[1].length);
			}

			originalText = originalText.substring(0, addition[0]) + addition[1] + originalText.substring(addition[0]);

		}
		else {
			console.warn("nodeAt returned null for structure:");
			console.warn(strip(structure));
			console.warn("and addition");
			console.warn(addition);
		}
	}
}

function _applyDeletionToStructure(structure, originalText, deletion, color, isPost) {
	deletion = deletion.slice();


	var deleting = originalText.substring(deletion[0], deletion[0] + deletion[1])
	var textDeletions = deleting.split('\n'), deletions = [];

	for (var i = 0; i < textDeletions.length; i++) {
		deletions.push([deletion[0], textDeletions[i].length]);
	}

	
	for (var i = 0; i < deletions.length; i++) {

		var deletion = deletions[i];
		var deleting = originalText.substring(deletion[0], deletion[0] + deletion[1]);

		if (i != 0) {
			_removeNewLineFromStructure(structure, deletions[i-1][0]);
		}

		var node = nodeAtStructure(deletion[0], structure);
		var toDelete = deletion[1];


		//console.log("deleting", deletion, node[0], node[1]);
		var positionInNode;
		if (node) {
			positionInNode = node[1];
			node = node[0];
		}

		while (toDelete > 0) {
			if (node) {
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
				console.warn(strip(structure));
				console.warn("and deletion");
				console.warn([deletion[0], deletion[1]]);
				break;
			}
		}
	}
	
}

function applyTextChangesToStructure(structure, originalText, textChanges_, color, colorId, finalText) {
	var isPost = textChanges_[textChanges_.length - 1];

	console.log("id", colorId);
	var textOffset = 0, lastOffset = 0;
	for (var i = 0; i < textChanges_.length - 1; i++) {

		var textChange_ = textChanges_[i];

		if (textChange_.length == 2){
			if (typeof textChange_[1] == "string") {
				_applyAdditionToStructure(structure, originalText, textChange_, color, colorId, isPost && i == textChanges_.length - 2);

				textOffset += textChange_[1].length;
			}
			else {
				_applyDeletionToStructure(structure, originalText, textChange_, color, isPost && i == textChanges_.length - 2);
				textOffset -= textChange_[1];
			}
		}
		else {
			_applyDeletionToStructure(structure, originalText, [textChange_[0], textChange_[2]], color);
			_applyAdditionToStructure(structure, originalText, [textChange_[0], textChange_[1]], color, colorId);

			textOffset += textChange_[1].length - textChange_[2];
		}

		originalText = executeChanges(originalText, [textChange_, false], (isPost && i == textChanges_.length - 2) ? 0 : lastOffset);

		lastOffset = textOffset;
	}

	if (originalText != finalText) {
		if (typeof alert != "undefined") alert('text problem 2');
		console.log('text problem 2');
		console.log(originalText);
		console.log(finalText);
	}
}

if (typeof exports != "undefined") exports.applyTextChangesToStructure = applyTextChangesToStructure;

function applyOffsets(changes1, changes2) {
	for (var i = 0; i < changes2.length - 1; i++) {
		var change2 = changes2[i];
		for (var n = 0; n < changes1.length - 1; n++) {
			var change1 = changes1[n];

			var offset = 0;
			if (change1.length == 2) {
				if (typeof change1[1] == "string") {
					if (change1[0] <= change2[0]) offset = change1[1].length;
				}
				else {
					if (change1[0] + change1[1] < change2[0]) offset = -change1[1];
					else if (change1[0] <= change2[0]) offset = -(change2[0] - change1[0]);
				}
			}
			else {
				var range = change1[1].length - change1[2];
				if (change1[0] <= change2[0]) offset = range;
			}

			change2[0] += offset;
		}
	}
}

if (typeof exports != "undefined") exports.applyOffsets = applyOffsets;

function getNodeChanges(node1, node2, cursor) {
	var node1 = node1 || $('#section1')[0];
	var node2 = node2 || $('#section2')[0];

	var sd = structureDifferences(node1, nodeTree(node2, true, false));
	
	//console.log(node1);
	//console.log("node2 tree: " + nodeTree(node2, true, false).outerHTML);
	
	var textChanges_ = changes(node1, node2, cursor);
	
	
	if (sd) sd[1] = sd[1].outerHTML || sd[1].textContent;
	
	return [sd, textChanges_];
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




function changes(parent1, parent2, cursor) {
	var changes = [];
	
	var nodes1 = parent1.childNodes;
	var text1 = nodes1.length == 0 ? "" : getText(parent1);
	
	var nodes2 = parent2.childNodes;
	var text2 = nodes2.length == 0 ? "" : getText(parent2);

	changes = textChanges(text1, text2, parent2, cursor);
	
	return changes;
}



function textChanges(val1, val2, node2, cursor) {

	//console.log("checking");
	//console.log(val1);
	//console.log(val2);

	var changes = [];

	for (var pos1 = val1.length-1, pos2 = val2.length-1; pos1 >= 0 && pos2 >= 0; pos1--, pos2--) {
		if (val1.charAt(pos1) != val2.charAt(pos2)) break;
	}

	var originalVal1 = val1;

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


	if (cursor) {
		var textContent = getText(node2), textContentLength = textContent.length;

		var cursor_ = cursor.slice();


		for (var i = 0; i < cursor_.length; i++) {
			var curs = cursor_[i].slice();

			var divs = node2.children, count = 0, newLineCount = 0;
			for (var n = 0; n < divs.length; n++) {
				count += divs[n].textContent.length;

				if (count < curs[0]) newLineCount++;
				else break;
			}
			curs[0] += newLineCount;

			cursor_[i] = curs;
		}

		var offset = 0;
		for (var i = 0; i < changes.length-1; i++) {
			var textChange = changes[i];

			if (textChange.length == 2) {

				var text, len;

				if (typeof textChange[1] == "string") {
					text = textChange[1];
					len = textChange[1].length;
					offset += len;
				}
				else {
					len = textChange[1];
					text = originalVal1.substring(textChange[0], textChange[0] + len);
					console.log("deleting " + text);
					offset -= len;
				}



				var incrs = [-len, len];

				var range = [];
				for (var n = 0; n < incrs.length; n++) {
					var incr = incrs[n];

					for (var pos = textChange[0]; true; pos += incr) {

						if (pos < 0 || pos >= textContentLength) {
							range.push(pos - incr);
							break;
						}

						var str = textContent.substring(pos, pos + len);

						if (str != text) {
							range.push(pos - incr);
							break;
						}
					}
				}
				range.push(i);

				if (range[0] != range[1]) {
					var c = cursor_[0][0] - 1;
					if (c >= range[0] && c <= range[1]) {
						if (range[2] == changes.length - 2) {
							changes[changes.length - 1] = c == textContentLength - 1 ? 1 : 0;
						}

						if (typeof textChange[1] != "string") c++;
						console.log("changeing from ", JSON.stringify(textChange[0]), " to ", JSON.stringify(c));
						textChange[0] = c;

					}
				}
			}
			else {
				offset += textChange[1].length - textChange[2];
			}
		}
	}
	
	
	return changes;
}

if (typeof exports != "undefined") exports.textChanges = textChanges;

function check(changes) {
	val1 = document.getElementById("section1").childNodes[0].parentNode.textContent;
	val2 = document.getElementById("section2").childNodes[0].parentNode.textContent;
	
	val1 = executeChanges(val1, changes);
	
	return val1 == val2;
}


function executeChanges(val, changes, startingOffset) {
	changes = changes.slice();
	var offset = startingOffset || 0;
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

function nodesToColorize(node, changes, className) {
	
	var toColor = toColorize(changes);
	
	var nodes = [];
	for (var i = 0; i < toColor.length; i++) {
		var toC = toColor[i];
		//console.log(node.textContent.substring(toC[0], toC[0] + toC[1]));

		var ns = nodesToColorizeHelper(node, [toC[0], toC[0] + toC[1]], className);
		for (var n = 0; n < ns.length; n++) {

			nodes.push(ns[n]);
		}

	}
	
	return nodes;
}

function nodesToColorizeHelper(node, range, className, len, nodesInRange, soFar) { // returns the nodes with the ranges relative to said nodes to colorize
	
	soFar = soFar || [];
	nodesInRange = nodesInRange || [];
	len = len || 0;
	
	if (node.nodeName.toLowerCase() != "#text") {
		
		//console.log(node);
		for (var i = 0; i < node.childNodes.length; i++) {
			
			var soFarC = soFar.slice();
			soFarC.push(i);
			
			nodesToColorizeHelper(node.childNodes[i], range, className, len, nodesInRange, soFarC);
			
			len += node.childNodes[i].textContent.length;
		}
		
		return nodesInRange;
	}
	
	var theColor = color || "#0000ff";
	
	if ( (range[0] >= len && range[0] < len + node.textContent.length) || (range[1] > len && range[1] <= len + node.textContent.length) ) {
		if (getColor(node) != theColor || className != node.className) {
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

function colorize(node, changes, col, className) {
	
	var nodes = nodesToColorize(node, changes, className);

	console.log("colorizing nodes " + JSON.stringify(nodes));
	
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
		
		if (getColor(node) != theColor || node.className != className) {
			var text = node.textContent;
			
			var part1 = text.substring(0, range[0]);
			var part2 = text.substring(range[0], range[0] + range[1]);
			var part3 = text.substring(range[0] + range[1]);
			
			var parent = node.parentNode;
			if (part1 != "") parent.insertBefore(document.createTextNode(part1), node);
			
			
			var font = document.createElement("font");
			font.color = theColor;
			font.className = className;
			font.appendChild( document.createTextNode(part2) );
			parent.insertBefore(font, node);
			
			if (part3 != "") parent.insertBefore(document.createTextNode(part3), node);
			
			parent.removeChild(node);
		}
		else {  }
	}
	
	return nodes;
}


function colorizeStructure(nodesToColor, structure, Color, className) {
	
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
		font.className = className;
		font.appendChild( document.createTextNode("" + range[1]) );
		parent.insertBefore(font, node);
		
		
		var end = range[0] + range[1];
		if (end < textLength) parent.insertBefore(document.createTextNode("" + (textLength - end)), node);
		
		parent.removeChild(node);
	}
}



if (typeof exports != "undefined") exports.colorizeStructure = colorizeStructure;