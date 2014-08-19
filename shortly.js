var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var session = require('express-session')

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();
app.use(session({secret: 'keyboard cat'}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', util.checkUser,
function(req, res) {
  res.render('index');
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.get('/links', util.checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    console.log("app.get links is working")
    res.send(200, links.models);
  });
});


//when submitting a new link
app.post('/links', /*util.checkUser,*/
function(req, res) {
  console.log("app.post made it past util.checkUser")
  if (!util.isValidUrl(req.body.url)) {
    return res.send(404);
  }

  new Link({ url: req.body.url }).fetch().then(function(found) {
    if (found) {
      console.log('response is being sent when Link is found');
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(req.body.url, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: req.body.url,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          console.log("response code for link.save");
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/login',
function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

    passHash = crypto.createHash('sha1');
    passHash.update(password);
    var hashedPassword = passHash.digest('hex');
    //TO-DO: PUT IN SALT HERE LATER!

  new User({ username: req.body.username, password: hashedPassword})
    .fetch()
    .then(function(found) {
    if (found) {
      console.log("correct sign-in");
      req.session.regenerate(function(){
        req.session.user = username;
        res.redirect('/');
      })
    } else {
      console.log("wrong password/login");
      res.redirect('/');
    }
  //       var user = new User({
  //         username: req.body.username,
  //         password: hashedPassword,
  //       });

  //       user.save().then(function(user) {
  //         Users.add(user);
  //         res.render('index');
  //       });
  });
});



app.post('/signup',
function(req, res) {
  console.log("request.body from app.post: ", req.body);
    passHash = crypto.createHash('sha1');
    passHash.update(req.body.password);
    var hashedPassword = passHash.digest('hex');
    //TO-DO: PUT IN SALT HERE LATER!

  new User({ username: req.body.username})
    .fetch()
    .then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
        var user = new User({
          username: req.body.username,
          password: hashedPassword,
        });

        user.save().then(function(user) {
          Users.add(user);
          req.session.regenerate(function(){
            req.session.user = req.body.username;
            res.redirect('/');
          });
        });
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
