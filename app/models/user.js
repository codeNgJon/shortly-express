var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var crypto = require('crypto');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  // defaults: {
  //
  //
  //   visits: 0
  // },);
  //
  //
  initialize: function(){
  this.on('creating', function(model, attrs, options){
  //   var shasum = crypto.createHash('sha1');
  //   shasum.update(model.get('password'));
  //   model.set('password', shasum.digest('hex'));
  // });
    // bcrypt.hash
      var cipher = Promise.promisify(bcrypt.hash);
      return cipher(model.get('password'), null, null).then(function(err, hash){
        console.log("hash from newUser: ", hash)
        model.set('password', hash);
      });
    });
}
});


module.exports = User;
