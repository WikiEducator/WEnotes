"use strict";

var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client');

var options = JSON.parse(fs.readFileSync('options.json', 'utf8'));
var mentionsdb = couch(options['url'] + '/' + options['db']),
    weavatarsdb = couch(options['url'] + '/weavatars');
var weAPI = 'http://WikiEducator.org/api.php';
var host = 'wikieducator.org';

var lookups = 0,
    weusers = {},
    userpages = [],
    files = [],
    avatars = [];

function queryString(args, titles) {
  var i;
  var qs = [], t = [];
  for (i=0; i<titles.length; i++) {
    t[i] = encodeURIComponent(titles[i]);
  }
  args.titles = t.join('|');
  for (i in args) {
    qs.push(i + '=' + args[i]);
  }
  return qs.join('&');
}

function fetchAvatars() {
  var i;
  console.log('fetchAvatars: files=', files);
  if (files.length === 0) {
    if (userpages.length) {
      process.nextTick(checkUserpages);
    }
    return;
  }

  var args = {
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '48',
    iiurlheight: '48'
  }
  var options = {
    host: host,
    port: 80,
    path: '/api.php?' + queryString(args, files)
  };

  http.get(options, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      try {
        var r = JSON.parse(body);
      } catch(err) {
        console.log('*** Unable to parse API result', err);
        console.log(status);
        console.log(headers);
        throw(err);
      }
      if (r && r.query && r.query.normalized) {
        var norm;
        var norms = r.query.normalized;
        for (norm in norms) {
          for (i=0; i<avatars.length; i++) {
            if (avatars[i].file === norms[norm].from) {
              avatars[i].file = norms[norm].to;
              break;
            }
          }
        }
      }
      if (r && r.query && r.query.pages) {
        var page;
        var pages = r.query.pages;
        for (page in pages) {
          for (i=0; i<avatars.length; i++) {
            if (avatars[i].file === pages[page].title) {
              avatars[i].url = pages[page].imageinfo[0].thumburl;
              avatars[i].file = avatars[i].file.substring(5);
              break;
            }
          }
        }
      }
      console.log('save avatars', avatars);
      for (i=0; i<avatars.length; i++) {
        if (avatars[i].url && avatars[i].file) {
          weavatarsdb.save(avatars[i], function(err, doc) {
            if (err) {
              console.log('***** error saving', avatars[i]);
              console.log(err);
              throw(err);
            }
            console.log('saved: ', doc);
          });
        } else {
          console.log('***** missing url and/or file:', avatars[i]);
        }
      }
      if (userpages.length) {
        process.nextTick(checkUserpages);
      }
    });
  });
}

function checkUserpages() {
  var i;
  if (userpages.length === 0) {
    return;
  }

  // limit number queried in a single Mediawiki API request
  var todo = (userpages.length > 50) ? 50 : userpages.length;
  var args = {
    action: 'query',
    format: 'json',
    prop: 'revisions',
    rvprop: 'content'
  };
  var options = {
    host: 'WikiEducator.org',
    port: 80,
    path: '/api.php?' + queryString(args, userpages.splice(0, todo))
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
          var page = pages[pg];
          var content = '';
          if (page.revisions && page.revisions[0]) {
            content = page.revisions[0]['*'];
          }
          var photom = /\|\s*photo\s*=\s*\[\[([^\]|\u200e]+)/i.exec(content);
          var photo = photom ? photom[1] : '';
          console.log(page.title, photo);
          var stockm = /(file|image):wikieducator_logo100.jpg/i.exec(photo);
          if (stockm) {
            console.log('WE logo, skipping');
            console.log('============');
            continue;
          }
          if (photo) {
            files.push(photo.replace(/^\s+|\s+$/g, ''));
            avatars.push({
              _id: page.title.substring(5),
              file: photo.replace(/^\s+|\s+$/g)});
          }
          console.log('============');
        }
      }
      fetchAvatars();
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

