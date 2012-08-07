"use strict";

var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client');

var options = JSON.parse(fs.readFileSync('options.json', 'utf8'));
var mentionsdb = couch(options['url'] + '/' + options['db']);

var i;

mentionsdb.view('/mentions/_design/messages/_view/tag_time', {},
    function(err, doc) {
      console.log('err', err);
      console.log('doc', doc);
      for (i = 0; i < doc.total_rows; i++) {
        mentionsdb.remove(doc.rows[i].id);
      }
      console.log('all removed, wait for it to happen');
    });

