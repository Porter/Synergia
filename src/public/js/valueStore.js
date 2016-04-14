// valueStore will help keep edits
var exports;
if (typeof(module) != "undefined") exports = module.exports = {};
else exports = {}

function nextNumber(num, cycleLen) {
	return (cycleLen + num + 1)%cycleLen;
}

function ValueStore(currentText, colors, cycleLen) {
	this.currentText = currentText;
	this.colors = colors;
	this.cycleLen = cycleLen;
}

if (typeof(copyColors) == "undefined") {
	var util = require("./util");
	copyColors = util.copyColors;
	copyEdit = util.copyEdit;
}

ValueStore.prototype.addEdit = function(edit, user, history, editNumber, offsetDepth) {

	edit = copyEdit(edit); // don't want to modify the original

	editNumber = ((editNumber - offsetDepth) + cycleLen) % cycleLen;

	for (var i = 0; i < offsetDepth; i++, editNumber = nextNumber(editNumber, this.cycleLen)) {
		console.log('applying ', JSON.stringify(history[editNumber]['edit']));
		applyOffsets(edit, history[editNumber]['edit']);
		console.log('new edit ', JSON.stringify(edit));
	}

	this.currentText = applyEditPath(this.currentText, edit);
	applyEditPathToColors(this.colors, edit, user);
}

ValueStore.prototype.getText = function() { return this.currentText; }
ValueStore.prototype.getColors = function() { return copyColors(this.colors); }

exports.ValueStore = ValueStore;
