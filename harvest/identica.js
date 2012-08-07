"use strict";

var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client');

var doTags = [],
    done;

var options = JSON.parse(fs.readFileSync('options.json', 'utf8'));
var mentionsdb = couch(options['url'] + '/' + options['db']);
var tags = options['tags'];

var i;

function getLastID() {
  var tag, lastID;
  if (tags.length === 0) return;
  tag = tags.shift();
  //console.log('get lastid for ' + tag);
  mentionsdb.view('/mentions/_design/ids/_view/identica',
      {startkey: [tag, {}], descending: true, limit: 1},
       function(err, doc) {
        if (err) {
          throw err;
        }
        if (doc.error) {
          throw doc.error;
        }
        lastID = (doc.rows.length > 0) ? doc.rows[0].value : 0;
        doTags.push({tag: tag, lastID: lastID});
        if (doTags.length === 1) {
          getDents();
        }
        process.nextTick(getLastID);
                                                                     });
}

function getDents() {
  var d, tag, sinceID, body,
      options = {};

  if (doTags.length === 0) return;
  d = doTags.shift();
  tag = d.tag;
  sinceID = d.lastID;
  options = {
    host: 'identi.ca',
    port: 80,
    path: '/api/statusnet/tags/timeline/' + tag + '.json?since_id=' + sinceID
  };

  http.get(options, function(res) {
    body = '';
    var status = res.statusCode;
    var headers = JSON.stringify(res.headers);
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      if (status === 503) {
        return;
      }
      try {
        var r = JSON.parse(body);
      } catch (err) {
        console.log('*** Unable to parse body', err);
        console.log(status);
        console.log(headers);
        console.log(body);
        throw(err);
      }
      if (r.length > 0) {
        var l = r.length - 1;
        while (l >= 0) {
          if (r[l].id > sinceID) {
            var d = new Date(r[l].created_at);
            r[l].we_timestamp = JSON.stringify(d).replace(/"/g, '');
            r[l].we_source = 'identica';
            r[l].we_tag = tag;
            mentionsdb.save(r[l], function() {
            });
          }
          l -= 1;
        }
      }
      process.nextTick(getDents);
    });
  });
}

getLastID();

