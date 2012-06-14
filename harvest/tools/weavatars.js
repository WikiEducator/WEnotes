"use strict";

var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client');

var couchserver = JSON.parse(fs.readFileSync('couchserver.json', 'utf8'));
var mentionsdb = couch(couchserver['url'] + '/' + couchserver['db']),
    weavatarsdb = couch('http://wikieducator.iriscouch.com:5984/weavatars');

var lookups = 0,
    weusers = {},
    userpages = [];

function checkUserpages() {
  if (userpages.length === 0) {
    return;
  }

  var weAPI = 'http://WikiEducator.org/api.php';
  var args = {
    action: 'query',
    format: 'json',
    prop: 'revisions',
    rvprop: 'content'
    //prop: 'images',
    //imlimit: 500,
  };
  var i, qs;

  for (i=0; i<userpages.length; i++) {
    userpages[i] = encodeURIComponent(userpages[i]);
  }
  args.titles = userpages.join('|');

  qs = [];
  for (i in args) {
    qs.push(i + '=' + args[i]);
  }

  var options = {
    host: 'WikiEducator.org',
    port: 80,
    path: '/api.php?' + qs.join('&')
  };

  http.get(options, function(res) {
    var body = '';
    var status = res.statusCode;
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      var pg;
      try {
        var r = JSON.parse(body);
      } catch(err) {
        console.log('*** Unable to parse API result', err);
        console.log(status);  
        console.log(headers);
        throw(err);
      }
      var pages = r.query.pages;
      for (pg in pages) {
        if (pg >= 0) {
          console.log(pg, pages[pg]);
        }
      }
    })
  });
}

function updateDocs() {
  var p;
  if (lookups > 0) {
    process.nextTick(updateDocs);
    return;
  }

  for (p in weusers) {
    if (! weusers[p]) {
      userpages.push('User:' + p);
    }
  }
  checkUserpages();
}

// get all the mentions that are missing a profile image
mentionsdb.view('/mentions/_design/messages/_view/missing_weavatars',
    function(err, doc) {
      var i, user;
      if (err) throw err;
      for (i = 0; i < doc.rows.length; i++) {
        user = doc.rows[i].key;
        if (!(user in weusers)) {
          weusers[user] = '';
          lookups++;
          weavatarsdb.get(user, function (err, d) {
            lookups--;
            if (err) {
              // anything but "missing" is a major problem
              if (err.errno !== 2) {
                throw err;
              }
            } else {
              weusers[d._id] = d.url;
            }
            if ((lookups === 0) && (i === doc.rows.length)) {
              updateDocs();
            }
          });
        }
      }
    });

