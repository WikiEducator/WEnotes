/* IE7 shim
var console = {
  log: function () {}
}
*/
/* shim for toISOString()
 */

if ( !Date.prototype.toISOString ) {
  (function() {
    function pad(number) {
      var r = String(number);
      if (r.length === 1) {
        r = '0' + r;
      }
      return r;
    }
 
    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + String((this.getUTCMilliseconds()/1000).toFixed(3)).slice(2, 5) +
        'Z';
      };
  
  }());
}

/* WEnotes widget
 * Copyright 2012 Open Education Resource Foundation
 * Available under CC-BY-SA license.
 */

  // variables made public to simplify debugging/monitoring
  var wendivs = [];

(function () {

  // scheme, host:port
  var couchHost = 'http://wikieducator.iriscouch.com/',
      couchDB = 'mentions',
      couchURL = couchHost + couchDB + '/_design/messages/_view/tag_time?';

  function formatMessage(d) {
    var msg, userName, userFullname;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var sourceProfile = {
      twitter: 'http://twitter.com/',
      identica: 'http://identi.ca/',
      wikieducator: 'http://WikiEducator.org/User:',
      'g+': '#'
    };
    var sourceTag = {
      twitter: 'http://twitter.com/#!/search?q=%23',
      identica: 'http://identi.ca/tag/',
      wikieducator: 'http://WikiEducator.org/',
      'g+': 'http://plus.google.com/s/%23'
    };
    var id = d.id;
    var source = d.we_source;
    var user = d.user || d.from_user || d.actor.id;

    var text = d.text;
    var timeLink = '#';
    var profileURL = d.profile_url || '#';
    var profileIMG = user.profile_image_url || d.profile_image_url ||
        '/extensions/WEnotes/missing.gif';
    userName = user.screen_name || user;
    userFullname = user.name || d.from_user_name;

    switch (source) {
    case 'wikieducator':
      profileURL = 'http://WikiEducator.org/User:' + user;
      break;
    case 'twitter':
      timeLink = 'http://twitter.com/#!/' + user + '/status/' + d.id_str;
      profileURL = 'http://twitter.com/' + user;
      break;
    case 'identica':
      timeLink = 'http://identi.ca/notice/' + d.id;
      profileURL = user.statusnet_profile_url;
      break;
    case 'g+':
      timeLink = d.url.replace('https://', 'http://');
      text = d.title;
      profileURL = d.actor.url.replace('https://', 'http://');
      profileIMG = d.actor.image.url.replace('https://', 'http://');
      userFullname = d.actor.displayName;
      user = '';
      userName = userFullname;
      // old versions of IE don't understand ISO date format
      var dp = d.published.split(/[-T.Z]/);
      d.created_at = [dp[0], months[dp[1]-1], dp[2], ''].join(' ') + dp[3];
      break;
    case 'moodle':
    case 'ask':
      timeLink = d.we_link;
      break;
    }

    // This text markup routine derived from one
    // Copyright Kent Brewster 2008  CC-BY-SA-3
    // see http://kentbrewster.com/identica-badge for info
    // FIXME unfortunately \w is too lenient when livening URLs
    text = text.replace(/((http|https):\/\/|\!|@|#)(([\w_]+)?[^\s]*)/g,
      function(sub, type, scheme, url, word, offset, full) {
        var moniker;
        //debug.log("====\nsub:" + sub + "\ntype:" + type +
        //  "\nscheme:" + scheme + "\nurl:" + url + "\nword:" + word);
        if(!word) return sub; // just punctuation
        var label = ''; var href = ''; var prefix = '';

        if (word) {
          // special case for WikiEducator user names
          if ((type === '@') && (source === 'wikieducator')) {
            moniker = word;
          } else {
            moniker = word.split('_'); // behaviour with underscores differs
            if(type === '#') moniker = moniker.join('');
            else word = moniker = moniker[0].toLowerCase();
          }
        }

        switch(type) {
          case 'http://': case 'https://': // html links
            href = scheme + '://' + url; break;
          case '@': // link users
            href = sourceProfile[source] + moniker; break;
          case '!': // link groups
            href = 'http://identi.ca/group/' + moniker;
            break;
          case '#': // link tags
            href = sourceTag[source] + moniker;
            break;
        }
        if (scheme) { // only urls will have scheme
          label = sub;
        } else {
          label = word; prefix = type;
        }
        // only identica has groups
        if ((type === '!') && (source !== 'identica')) {
          return label;
        }
        return prefix+'<a href="' + href + '" target="_identica">' + label + '</a>';
      });

    // liven abridged marks
    switch (source) {
    case 'identica':
    case 'g+':
      text = text.replace(/\.\.\.$/, '<a href="' + timeLink + '">...</a>');
      break;
    case 'moodle':
    case 'ask':
    case 'feed':
      if (d.truncated) {
        text = text.substring(0, text.lastIndexOf('...')) +
          '<a class="external text" href="' + d.we_link + '">...</a>';
      }
      break;
    }

    msg = '<div id="WEitf' + d._id + '" style="margin: 2px;">';
    msg += '<a href="' + profileURL + '"><img ';
    if (profileIMG === '/extensions/WEnotes/missing.gif') {
      // try to make a legal class name, after encoding, encode any
      //   underscores as well... and then replace % with _
      var encName = encodeURIComponent(userName).replace(/_/g, '%5F')
          .replace(/%/g, '_');
      msg += 'class="WEni_' + encName +'" ';
    }
    msg += 'src="' + profileIMG +
      '" border=0 style="float: left;" height=48 width=48></a>' +
      '<div style="margin-left: 53px;">';
    msg += '<a href="' + profileURL + '" style="text-decoration: none;">' +
      '<b>' + userFullname + '</b>&nbsp;&nbsp;<span style="color:#999;">' +
      '@' + userName + '</a></span><br />';
    msg += text;
    var dt = new Date(d.created_at);
    var dt_ago = '<abbr class="timeago" title="' + dt.toISOString() + '">' +
      dt.getUTCDate() + ' ' + months[dt.getUTCMonth()] + '</abbr>';
    msg += '<br /><span style="color: #999; font-size: smaller;">' +
      d.we_source + '&nbsp;&nbsp;&nbsp;<a href="' + timeLink +
      '" title="' + dt.toUTCString() + '" style="text-decoration: none;">' +
      dt_ago + '</a>';
    if ($.inArray('sysop', window.wgUserGroups) > -1) {
      msg += '&nbsp;&nbsp;&nbsp;' +
        '<a href="http://wikieducator.iriscouch.com:5984/_utils/document.html?' +
        couchDB + '/' +
        d._id + '">db</a>';
      /*
      msg += '&nbsp;&nbsp;&nbsp;' +
        '<a href="#" class="WEnd" id="WEnd_' + d._id + '_' + d._rev +
        '">del</a>';
      */
    }
    msg += '</span></div><br clear="both"></div>';
    return msg;
  }

  function makeCouchqs(options) {
    var i,
        optionList = [];

    for (i in options) {
      if (options.hasOwnProperty(i)) {
        optionList.push(i + '=' + encodeURIComponent(options[i]));
      }
    }
    return optionList.join('&');
  }

  /*
  function delDoc(event) {
    var id, rev, part = [];
    console.log(event.target, event.target.id);
    if (event && event.target && event.target.id) {
      part = event.target.id.split('_');
      if (part.length === 3) {
        id = part[1];
        rev = part[2];
        console.log('id',id,'rev',rev);
        $.ajax({
          url: couchHost + couchDB + '/' + id,
          type: 'PUT',
          datatype: 'jsonp',
          data: {
            _rev: rev,
            _deleted: true
          },
          success: function() {
            $('#WEitf' + id).css('opacity', '0.5')
              .css('filter', 'alpha(opacity = 50)');
          }
        });
      }
    }
  }
  */

  function getMore(event) {
    //debug.log('getMore', event.data.ix);
    var ix = event.data.ix,
        tag = wendivs[ix].tag,
        count = wendivs[ix].moreCount + 1,
        $wenm = $('#WEnotesMore' + ix),
        $wenmdi = $('#WEnotesMoreDiv' + ix + ' img');
    
    $wenmdi.css('visibility', 'visible');
    $wenm.css('visibility', 'hidden');
    var options = {
      key: '["' + tag + '"]',
      startkey: '["' + tag + '", "' + wendivs[ix].first +'"]',
      endkey: '["' + tag + '", "2011-01-01T00:00:00.000Z"]',
      descending: true,
      include_docs: true,
      limit: count
    };
    $.ajax({
        url: couchURL + makeCouchqs(options),
        cache: false,
        dataType: 'jsonp',
        failure: function() {
          $wenmdi.css('visibility', 'hidden');
          $wenm.css('visibility', 'visible');
        },
        success: function(data) {
          //debug.log(data);
          var i, d, id,
              mid = '#WEnotesMoreDiv' + ix,
              rows = data.rows;
          // FIXME ignore first row which is a duplicate of current "first"
          //  to avoid having to calculate first - 0.001
          // check if we are at the end of the database
          if (rows.length <= 1) {
            $(mid).hide();
            return;
          }
          for (i=1; i < rows.length; i++) {
            d = rows[i].doc;
            //debug.log(i, d);
            id = d.id;
            if (d.we_timestamp > wendivs[ix].last) {
              wendivs[ix].last = d.we_timestamp;
            }
            if (d.we_timestamp < wendivs[ix].first) {
              wendivs[ix].first = d.we_timestamp;
            }
            $(mid).before(formatMessage(d));
            $('#WEitf'+d._id).find('abbr.timeago').timeago();
            //$(lid).effect("highlight", {}, 1500);
          }
          $wenmdi.css('visibility', 'hidden');
          $wenm.css('visibility', 'visible');
          wendivs[ix].moreCount += 20;
        }
    });
  }

  function WEnotes(ix) {
    var dx = wendivs[ix];
    //debug.log('WEnotes function', ix, dx);

    var tag = dx.tag || 'wikieducator';
    var count = dx.count || 20;
    var last = dx.last || '2011-01-01T00:00:00.000Z';
    // exploits knowing the milliseconds of all we_timestamp = .000
    var lastplus = dx.last.slice(0, -2) + '1Z';
    if (dx.timer) {
      clearTimeout(dx.timer);
    }
    var refreshtime = 30000;

    var options = {
      key: '["' + tag + '"]',
      startkey: '["' + tag + '",{}]',
      endkey: '["' + tag + '", "' + lastplus + '"]',
      descending: true,
      include_docs: true,
      limit: count
    };
    $.ajax({
        url: couchURL + makeCouchqs(options),
        cache: false,
        dataType: 'jsonp',
        failure: function() {
          // hope things are better later
          dx.timer = setTimeout(function() {$('div.WEnotes:first')
                      .triggerHandler('WEnotes', [dx.tag]);}, refreshtime);
        },
        success: function(data) {
          //debug.log(data);
          if (!dx.nospinner) {
            wendivs[ix].nospinner = true;
            dx.$d.find('.WEnotesSpinner').remove();
          }
          var i, j, msg, user;
          var did = '.WEnotes';
          var lid = '.WEnotes';
          var rows = data.rows;
          if (!dx.nomore && (data.total_rows - data.offset > rows.length)) {
            wendivs[ix].nomore = true;
            $(lid).after('<div id="WEnotesMoreDiv' + ix +'">' +
              '<div style="float: left; margin-left: 53px;' +
              'margin-bottom: 1em; background-color: #f9f9f9;' +
              'border: 1px solid #aaaaaa; padding: 5px;">' +
              '<img src="/skins/common/images/Ajax-loader.gif" ' +
              'style="fload: left; visibility: hidden;" height="16"' +
              'width="16" /><a id="WEnotesMore' + ix +
              '" style="margin-right: 16px;">More ' + tag +
              ' notes</a></div></div><br clear="all" />');
            $('#WEnotesMore' + ix).bind('click', { ix: ix }, getMore);
          }
          for (i=0; i<rows.length; i++) {
            var d = rows[i].doc;
            //debug.log(i, d);
            var id = d.id;
            if (d.we_timestamp > wendivs[ix].last) {
              wendivs[ix].last = d.we_timestamp;
            }
            if (d.we_timestamp < wendivs[ix].first) {
              wendivs[ix].first = d.we_timestamp;
            }
            $(lid).after(formatMessage(d));
            lid = '#WEitf' + d._id;
            $(lid).find('abbr.timeago').timeago();
            //$(lid).effect("highlight", {}, 1500);
          }
          /* to stay at fixed length
          while ($(did + ' > div').length > count) {
            $(did + ' > div:last').remove();
          }
          */
        }
    });
  }

  function newPost(i, message) {
    console.log('new message for div', i, message, wendivs);
    // FIXME keep a local cache of IDs rather than querying DOM?
    if ($('#WEitf' + message._id).length === 0) {
      var wd = wendivs[i-1];
      wd.$d.after(formatMessage(message));
      $('#WEitf'+ message._id).find('abbr.timeago').timeago();
      console.log('Faye inserted');
    } else {
      console.log('duplicate received from Faye', message.id);
    }
  }

  function WEnotesHandler(event, tag) {
    //debug.log('WEnotesHandler', event, tag);
    $.each(wendivs, function (i, v) {
      //debug.log('iterating through wendivs', i, v);
      if (tag && v.tag !== tag) {
        return;
      }
      WEnotes(i);
    });
  }

  console.log('WENotes!');
  // only create one Faye client per page
  if (!window.WEFclient) {
    console.log("creating new Faye client");
    window.WEFclient = new Faye.Client('http://live.oer.me:80/faye', {
      timeout: 120
    });
  }
  console.log('have Faye client');
  var client = window.WEFclient;
  var subs = [];
  $('div.WEnotes').each(function(i) {
    var $thisd = $(this);
    var classes = $(this).attr('class').split(/\s+/);
    $.each(classes, function(i, v) {
      console.log("each classes", i);
      if (v.indexOf('WEnotes-') === 0) {
        var tag, message;
        var args = v.split('-', 3);
        console.log('args=', args);
        if (args.length === 3) {
          tag = args[2];
          console.log('about to add to wendivs', wendivs);
          wendivs.push({
            $d: $thisd,
            count: args[1],
            tag: args[2],
            last: '2011-01-01T00:00:00.000Z',
            first: '2999-12-31T23:59:59.999Z',
            moreCount: 20
          });
          console.log(i, tag, wendivs[i-1]);
          console.log('wendivs now', wendivs);

          console.log('attempt to subscribe', '/WEnotes/' + tag);
          subs[i] = client.subscribe('/WEnotes/' + tag, function(msg) {
            newPost(i, msg);
          });
          console.log('back from subscribe call');
          subs[i].callback(function() {
            console.log("subscription active", '/wenotes/' + tag);
          });
        }
      }
    });
  });
  $('div.WEnotes').on('WEnotes', WEnotesHandler);
  /*
  $(document).on('click', 'a.WEnd', {}, delDoc);
  */
  if (wendivs.length) {
    $('div.WEnotes:first').triggerHandler('WEnotes');
  }
}());
