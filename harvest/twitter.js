var fs = require('fs'),
    http = require('http'),
    couch = require('couch-client'),
    options = require('./options.json');

var mentionsdb = couch(options['url'] + '/' + options['db']);
var tags = options['tags'];
var ix;
var tagslen = tags.length;
for (i=0; i<tagslen; i++) {
  tags[i] = '#' + tags[i];
}

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
              // get a deep copy of r.results[l]
              mentionsdb.save(JSON.parse(JSON.stringify(r.results[l])), function() {
              });
            }
          }
          l -= 1;
        }
      }
    });
  });
}

// get the last id
mentionsdb.view('/mentions/_design/ids/_view/twitter',
    {descending: true, limit: 1}, function(err, doc) {
      if (err) throw err;
      getTweets((doc.rows.length > 0) ? doc.rows[0].value : 0);
                                                    });

