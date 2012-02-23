"use strict";

var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client');

var couchserver = JSON.parse(fs.readFileSync('couchserver.json', 'utf8'));
var mentionsdb = couch(couchserver['url'] + '/' + couchserver['db']),
    weavatarsdb = couch('http://wikieducator.iriscouch.com:5984/weavatars');

function getTweets(sinceID) {
  var i, query, body,
      regexps = [],
      options = {};

  for (i=0; i<tags.length; i++) {
    regexps[i] = new RegExp(tags[i], "i");
  }
  query = encodeURIComponent(tags.join(' OR '));

  options = {
  host: 'api.twitter.com',
  port: 80,
  path: '/search.json?q=' + query + '&include_entities=true&since_id=' + sinceID
};

  http.get(options, function(res) {
    body = '';
    var status = res.statusCode;
    var headers = JSON.stringify(res.headers);
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      try {
        var r = JSON.parse(body);
      } catch(err) {
        console.log('*** Unable to parse body', err);
        console.log(status);
        console.log(headers);
        console.log(body);
        throw(err);
      }
      if (r.results) {
        var l = r.results.length - 1;
        while (l >= 0) {
          var d = new Date(r.results[l].created_at);
          r.results[l].we_timestamp = JSON.stringify(d).replace(/"/g, '');
          r.results[l].we_source = 'twitter';
          for (i=0; i<tags.length; i++) {
            if(regexps[i].test(r.results[l].text)) {
              r.results[l].we_tag = tags[i].substring(1);
              mentionsdb.save(r.results[l], function() {
              });
            }
          }
          l -= 1;
        }
      }
    });
  });
}

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
    rvprop: 'content',
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

