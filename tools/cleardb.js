"use strict";

var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client');

var couchserver = JSON.parse(fs.readFileSync('couchserver.json', 'utf8'));
var mentionsdb = couch(couchserver['url'] + '/' + couchserver['db']);

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

