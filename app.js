var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var config = require('./config');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.mongodb.uri);
var index = require('./routes/index');
var request = require('request');

db.collection('clients');

var app = express();
app.config = config;

// Initialize kafka and topic
var queue = require('./lib/wrappers/kafka')();
console.info(app.config.kafka);

queue.Init(app.config.kafka, function(error){
  if(error){
    console.log("Error on kafka Init: " + error);
    return;
  }

  var webhookLib = require('./lib/webhook');
  queue.CreateConsumer(app.config.kafka.topicName, function(message){
    var value = JSON.parse(message.value);
    var webhooks = [];

    webhookLib.listWebhooks(db, {}, webhooks)(function(){
      for(var i in webhooks){
        this.options = {};
        this.options.url = webhooks[i].payload_url;
        this.options.method = "POST";
        this.options.body = JSON.stringify(value.body);
        this.options.headers = {
          'Content-Type': 'application/json',
          'X-Analytics-Event': value.event
        }
    
        request(this.options, function(webhook){
          return function(error, response, body){
            if (!error && response.statusCode == 200) {
              console.log("Notified " + webhook.name + "("+webhook.payload_url+") of event " + value.event);
            }else
              console.log("Can't notify " + webhook.name + "("+webhook.payload_url+") of event " + value.event);
          }
        }(webhooks[i]));
      }
    });
  })
});

app.queue = queue;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser());
//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({secret: 'sm app', cookie: {}}));

// Make our db accessible to our router
app.use(function(req,res,next){
   req.db = db;
   next();
});

index(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  var info = {
        message: err.message,
        error: true
    };

    console.log(err);
    //info.stack = err.stack;

  res.status(err.status || 500).send(info);
});

module.exports = app;
