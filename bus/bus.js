var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Bus () {
  this.incomingMiddleware = [];
  this.outgoingMiddleware = [];
  EventEmitter.call(this);
}

util.inherits(Bus, EventEmitter);

Bus.prototype.use = function (middleware) {
  if (middleware.handleIncoming) this.incomingMiddleware.push(middleware.handleIncoming);
  if (middleware.handleOutgoing) this.outgoingMiddleware.push(middleware.handleOutgoing);
  return this;
}

Bus.prototype.handleIncoming = function (/* channel, message, options, callback */) {
  var index = this.incomingMiddleware.length - 1;
  var self = this;

  var args = Array.prototype.slice.call(arguments);

  var callback = args.pop();

  function next (err) {
    if (err) return callback(err);

    var layer;
    var args = Array.prototype.slice.call(arguments, 1);

    layer = self.incomingMiddleware[index];

    index = index - 1;

    if ( undefined === layer) {
      return callback.apply(self, args);
    } else {
      args.push(next);
      return layer.apply(self, args);
    }
  }

  args.unshift(null);

  return next.apply(this, args);
}

Bus.prototype.handleOutgoing = function (queueName, message, callback) {
  
  var index = 0;
  var self = this;


  function next (err) {
    if (err) return callback(err); 

    var layer;
    var args = Array.prototype.slice.call(arguments, 1);

    layer = self.outgoingMiddleware[index];

    index++;

    if ( undefined === layer) {
      return callback.apply(self, args);
    } else  {
      args.push(next);
      return layer.apply(self, args);
    } 
  }

  return next(null, queueName, message);
}

Bus.prototype.correlate = require('./middleware/correlate');
Bus.prototype.logger = require('./middleware/logger');
Bus.prototype.package = require('./middleware/package');
Bus.prototype.retry = require('./middleware/retry');
Bus.prototype.property = require('./middleware/property');

module.exports = Bus;