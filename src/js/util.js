module.exports = {
  getEnvironment: function () {

    var arguments = process.argv.slice(2), email = {}, keywords = ["email", "password"];
    var mode;

    if (typeof String.prototype.startsWith != 'function') {
      String.prototype.startsWith = function (str){
        return this.indexOf(str) === 0;
      };
    }

    for (var i = 0; i < arguments.length; i++) {
      var arg = "" + arguments[i].toString();
      for (var n = 0; n < keywords.length; n++) {
        var word = keywords[n];
        if (arg.startsWith(word + '=')) { email[word] = arg.substring(word.length + 1); }

        if (arg.startsWith('mode=')) mode = arg.substring(5);
      }
    }

    mode = mode || process.env.mode;

    email['email'] = email['email'] || process.env.my_email;
    email['password'] = email['password'] || process.env.my_password;

    var colors = require('colors');

    if (!email['email']) { console.warn("No email provided. Please set the environment variable: my_email".yellow); }
    if (!email['password']) { console.warn("No email password provided. Please set the environment variable: my_password".yellow)}

    return {email:email, mode:mode}
  }
};

