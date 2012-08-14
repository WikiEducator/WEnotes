/*
 * watch the CouchDB mentions database for changes
 * and publish them on the correct Faye channel
 *
 * Copyright 2012 Open Education Resources Foundation
 * @license MIT
 */
"use strict";

var cradle  = require('cradle'),
    faye    = require('faye'),
    Log     = require('log'),
    fs      = require('fs'),
    options = require('./options.json');

var log = new Log(Log.DEBUG, fs.createWriteStream('/tmp/couchwatch.txt', {
        flags: 'a'
}));

var ClientAuth = {
  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = options.fayepass;
    callback(message);
  }
};

var client = new faye.Client('http://live.oer.me/faye');
client.addExtension(ClientAuth);

var db = new(cradle.Connection)(options.url).database(options.db);

var feed = db.changes({
  since: 'now',
  include_docs: true
});

feed.on('change', function (change) {
  console.log(change);
  try {
    client.publish('/wenotes/' + change.doc.we_tag, change.doc);
  } catch (err) {
    log.error('publish error', err);
  }
});

feed.on('error', function(er) {
  log.error('Serious error trying to follow CouchDB changes');
  throw er;
});

