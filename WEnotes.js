/* IE console shim */
if ( ! window.console ) {
  (function() {
    var names = ["log", "debug", "info", "warn", "error",
        "assert", "dir", "dirxml", "group", "groupEnd", "time",
        "timeEnd", "count", "trace", "profile", "profileEnd"],
        i, l = names.length;

    window.console = {};

    for ( i = 0; i < l; i++ ) {
      window.console[ names[i] ] = function() {};
    }
  }());
}

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
var WEnotes = {};

(function () {

  // scheme, host:port
  var couchHost = 'http://wikieducator.iriscouch.com/',
      couchDB = 'mentions',
      couchURL = couchHost + couchDB + '/_design/messages/_view/tag_time?',
      couchURLall = couchHost + couchDB + '/_design/messages/_view/time?',
      weAPI = '/api.php';

  function API(data, success, failure) {
    data.action || (data.action = 'query');
    data.format || (data.format = 'json');
    return $.ajax({
      url: window.wgServer + weAPI,
      type: 'POST',
      data: data,
      success: success,
      failure: failure
    });
  }

  function windowConv() {
    var url = $(this).closest('.WEnote').find('abbr').parent().attr('href');
    window.open(url, '_twitter');
    return false;
  }

  function like() {
    var mo, cl, tag = '';
    var id = $(this).closest('.WEnote').attr('id');
    var like = $(this).hasClass('icon-star-empty');
    cl = $('#' + id).closest('.WEnotes').attr('class');
    mo = /WEnotes-\d+-([^ ]+)/.exec(cl);
    if (mo) {
      tag = mo[1];
    }
    if (tag === '_') {
      cl = $('#' + id + ' .WEtags').text();
      mo = /#([a-zA-Z0-9]+)/.exec(cl);
      if (mo) {
        tag = mo[1];
      }
    }
    // try to get the tag from the div
    if (wgUserName && tag) {
      API({
        action: 'wevotes',
        vopid: 'WN' + tag.toLowerCase(),
        vovid: id.slice(5),
        vovote: (like) ? 1 : 0,
        vopage: wgArticleId
      });
      if (like) {
        $(this).removeClass('icon-star-empty')
               .addClass('icon-star')
               .attr('title', 'unfavorite');
      } else {
        $(this).removeClass('icon-star')
               .addClass('icon-star-empty')
               .attr('title', 'favorite');
      }
    } else {
      alert("You must be logged in to vote.");
    }
    return false;
  }

  function getFaves(tag, ids) {
    if (tag === '_') return;
    tag = tag.toLowerCase();
    $.ajax({
      url: couchHost + 'votes/_design/vote/_view/myvotes?key=' + encodeURIComponent(JSON.stringify(['WN'+tag, wgUserName])),
      cache: false,
      dataType: 'jsonp',
      success: function(d) {
        var i, l;
        if (d.rows) {
          l = d.rows.length;
          for (i=0; i<l; i++) {
            if (d.rows[i].value[1]) {
              $('#WEitf'+d.rows[i].value[0]+' .icon-star-empty').removeClass('icon-star-empty')
                                                                .addClass('icon-star');
            }
          }
        }
      }
    });
  }

  function formatMessage(d, tag, novoting) {
    var msg, userName, userFullname, i;
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
      d.created_at = [dp[0], months[dp[1]-1], dp[2], ''].join(' ') + dp[3] + ' GMT';
      break;
    case 'feed':
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

    // if we don't have a profile img or url, use gravatar if available
    if (((profileIMG === '')||(profileIMG === '/extensions/WEnotes/missing.gif')) && d.gravatar) {
      profileIMG = 'http://www.gravatar.com/avatar/' + d.gravatar
         + '?s=48&d=identicon';
    }
    if ((profileURL === '') && d.gravatar) {
      profileURL = 'http://www.gravatar.com/' + d.gravatar;
    }
    msg = '<div id="WEitf' + d._id + '" class="WEnote">';
    msg += '<div class="WEnotepic"><a href="' +
            profileURL + '"><img ';
    if (profileIMG === '/extensions/WEnotes/missing.gif') {
      // try to make a legal class name, after encoding, encode any
      //   underscores as well... and then replace % with _
      var encName = encodeURIComponent(userName).replace(/_/g, '%5F')
          .replace(/%/g, '_');
      msg += 'class="WEni_' + encName +'" ';
    }
    // WikiEducator images are not necessarily square
    // try to get the width from the URL
    var imgwidth = (d.profile_image_width) ? d.profile_image_width : 48;
    var imgheight = (d.profile_image_height) ? d.profile_image_height : 48;
    var mo = profileIMG.match(/http:\/\/wikieducator\.org\/.*?\/(\d+)px-[^\/]+/i);
    if (mo) {
      imgwidth = mo[1];
    }
    msg += 'src="' + profileIMG +
      '" height=' + imgheight +
      ' width=' + imgwidth + '></a></div><div class="WEnotebody">';
    msg += '<a href="' + profileURL + '" style="text-decoration: none;">' +
      '<b>' + userFullname + '</b>&nbsp;&nbsp;<span class="WEnoteuser">' +
      '@' + userName + '</a></span><br />';
    msg += text;
    var dt = new Date(d.created_at);
    var dt_ago = '<abbr class="timeago" title="' + dt.toISOString() + '">' +
      dt.getUTCDate() + ' ' + months[dt.getUTCMonth()] + '</abbr>';
    msg += '<br /><span class="WEnotesub">';
    if (tag === '_') {
      if (d.we_tags) {
        msg += '<span class="WEtags">';
        for (i=0; i<d.we_tags.length; i++) {
          msg += '#' + d.we_tags[i] + '&nbsp;';
        }
      } else {
        msg += '#' + d.we_tag + '&nbsp;';
      }
      msg += '</span>';
      msg += '&nbsp;&nbsp;';
    }
    if (d.we_source === 'feed') {
      msg += '<span title="' + d.we_feed + '">blog</span>';
    } else {
      msg += d.we_source;
    }
    msg += '&nbsp;&nbsp;&nbsp;<a href="' + timeLink +
      '" title="' + dt.toUTCString() + '" style="text-decoration: none;">' +
      dt_ago + '</a>';
    if (!novoting) {
      msg += '&nbsp;&nbsp;&nbsp;<i title="favorite" class="icon-star-empty"></i>';
    }
    switch (source) {
    case 'twitter':
      // if the message is too old, don't show the conversation links
      if (((new Date().getTime() - dt.getTime())/86400000) > 5.0) break;
      // fall through to show links
    case 'g+':
      msg += '&nbsp;&nbsp;&nbsp;<i title="reply" class="icon-mail-reply"></i>';
      msg += '&nbsp;&nbsp;&nbsp;<i title="thread" class="icon-th-list"></i>';
    }
    msg += '&nbsp;<span class="wevtct"></span>';
    if ($.inArray('sysop', window.wgUserGroups) > -1) {
      msg += '&nbsp;&nbsp;&nbsp;' +
        '<a href="http://wikieducator.iriscouch.com:5984/_utils/document.html?' +
        couchDB + '/' +
        d._id + '" target="wenotesdb">db</a>';
      msg += '&nbsp;&nbsp;&nbsp;' +
        '<a href="#" class="WEnd" id="WEnd_' + d._id + '_' + d._rev +
        '">del</a>';
    }
    msg += '</span></div><br clear="both" /></div>';
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

  function getMore(event) {
    var options, url;
    var ix = event.data.ix,
        tag = wendivs[ix].tag,
        taglc = tag.toLowerCase(),
        count = wendivs[ix].moreCount + 1,
        $wenm = $('#WEnotesMore' + ix),
        $wenmdi = $('#WEnotesMoreDiv' + ix + ' img');
    
    $wenmdi.css('visibility', 'visible');
    $wenm.css('visibility', 'hidden');
    if (tag === '_') {
      url = couchURLall;
      options= {
        startkey: '"' + wendivs[ix].first +'"',
        endkey: '"2011-01-01T00:00:00.000Z"',
        descending: true,
        include_docs: true,
        limit: count
      };
    } else {
      url = couchURL;
      options = {
        key: '["' + taglc + '"]',
        startkey: '["' + taglc + '", "' + wendivs[ix].first +'"]',
        endkey: '["' + taglc + '", "2011-01-01T00:00:00.000Z"]',
        descending: true,
        include_docs: true,
        limit: count
      };
    }
    $.ajax({
        url: url + makeCouchqs(options),
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
            id = d.id;
            if (d.we_timestamp > wendivs[ix].last) {
              wendivs[ix].last = d.we_timestamp;
            }
            if (d.we_timestamp < wendivs[ix].first) {
              wendivs[ix].first = d.we_timestamp;
            }
            $(mid).before(formatMessage(d, tag));
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
    var url, options, ids=[];
    var dx = wendivs[ix];

    var tag = dx.tag || 'wikieducator';
    var taglc = tag.toLowerCase();
    var count = dx.count || 20;
    // exploits knowing the milliseconds of all we_timestamp = .000
    var lastplus = dx.last.slice(0, -2) + '1Z';
    if (dx.timer) {
      clearTimeout(dx.timer);
    }
    var refreshtime = 30000;

    if (tag === '_') {
      url = couchURLall;
      options = {
        endkey: '"' + lastplus + '"',
        descending: true,
        include_docs: true,
        limit: count
      };
    } else {
      url = couchURL;
      options = {
        key: '["' + taglc + '"]',
        startkey: '["' + taglc + '",{}]',
        endkey: '["' + taglc + '", "' + lastplus + '"]',
        descending: true,
        include_docs: true,
        limit: count
      };
    }

    $.ajax({
        url: url + makeCouchqs(options),
        cache: false,
        dataType: 'jsonp',
        failure: function() {
          // hope things are better later
          dx.timer = setTimeout(function() {$('div.WEnotes:first')
                      .triggerHandler('WEnotes', [dx.tag]);}, refreshtime);
        },
        success: function(data) {
          var i;
          var lid = '.WEnotes';
          var rows = data.rows;

          if (!dx.nospinner) {
            wendivs[ix].nospinner = true;
            dx.$d.find('.WEnotesSpinner').before('<div id="WEnote0_' + ix + '"></div>');
            dx.$d.find('.WEnotesSpinner').remove();
            lid = '#WEnote0_' + ix;
          }
          if (!dx.nomore && (data.total_rows - data.offset > rows.length)) {
            wendivs[ix].nomore = true;
            $(lid).after('<div id="WEnotesMoreDiv' + ix +'">' +
              '<div style="float: left; margin-left: 53px;' +
              'margin-bottom: 1em; background-color: #f9f9f9;' +
              'border: 1px solid #aaaaaa; padding: 5px;">' +
              '<img src="/skins/common/images/Ajax-loader.gif" ' +
              'style="float: left; visibility: hidden;" height="16"' +
              'width="16" /><a id="WEnotesMore' + ix +
              '" style="margin-right: 16px;">More ' + tag +
              ' notes</a></div></div><br clear="all" />');
            $('#WEnotesMore' + ix).bind('click', { ix: ix }, getMore);
          }
          for (i=0; i<rows.length; i++) {
            var d = rows[i].doc;
            if (d.we_timestamp > wendivs[ix].last) {
              wendivs[ix].last = d.we_timestamp;
            }
            if (d.we_timestamp < wendivs[ix].first) {
              wendivs[ix].first = d.we_timestamp;
            }
            $(lid).after(formatMessage(d, tag));
            lid = '#WEitf' + d._id;
            $(lid).find('abbr.timeago').timeago();
            ids.push(d._id);
          }
          /* to stay at fixed length
          while ($(did + ' > div').length > count) {
            $(did + ' > div:last').remove();
          }
          */
          getFaves(tag, ids);
        }
    });
  }

  // display list of ids in specified div
  //  ids can be an array or a string with comma separator
  function WEnotesList(div, ids) {
    if (typeof ids === 'string') {
      ids = ids.split(',');
    }
    $.ajax({
      url: couchHost + couchDB + '/_all_docs?include_docs=true&keys=' + encodeURIComponent(JSON.stringify(ids)),
      cache: false,
      dataType: 'jsonp',
      success: function(d) {
        var i, rowsl = d.rows.length;
        for (i=0; i<rowsl; i++) {
          $(div).append(formatMessage(d.rows[i].doc, '_', true));
        }
      }
    });
  }

  // display most popular WEnotes for given tag in specified div
  function WEnotesTop(div, tag, cnt) {
    tag = tag.toLowerCase();
    $.ajax({
      url: couchHost + 'votes/_design/vote/_view/totals?group=true&startkey=' + encodeURIComponent(JSON.stringify(['WN' + tag])) + '&endkey=' + encodeURIComponent(JSON.stringify(['WN'+tag, {}])),
      cache: false,
      dataType: 'jsonp',
      success: function(d) {
        var i, rowsl = d.rows.length,
            items = [], ids = [];
        for (i=0; i<rowsl; i++) {
          if (d.rows[i].value > 0) {
            items.push([d.rows[i].value, d.rows[i].key[1]])
          }
        }
        items.sort(function(a, b) {a = a[0]; b = b[0]; return a < b ? -1 : (a > b ? 1 : 0); });
        for (i=0; (i<items.length) && (i<cnt); i++) {
          ids.push(items[i][1]);
        }
        WEnotesList(div, ids);
      }
    });
  }

  function newPost(i, message) {
    // ignore design updates
    if (message._id.charAt(0) === '_') {
      return;
    }
    // FIXME keep a local cache of IDs rather than querying DOM?
    if ($('#WEitf' + message._id).length === 0) {
      if (!message.we_d) {   // don't show new deletions
        var wd = wendivs[i-1];
        wd.$d.prepend(formatMessage(message, wd.tag));
        $('#WEitf'+ message._id).find('abbr.timeago').timeago();
      }
    } else { // we've seen this message, is it going away?
      if (message.we_d) {
        $('#WEitf' + message._id).hide('fast');
      }
    }
  }

  function WEnotesHandler(event, tag) {
    console.log('WEnotesHandler', event, tag);
    $.each(wendivs, function (i, v) {
      //debug.log('iterating through wendivs', i, v);
      if (tag && v.tag !== tag) {
        return;
      }
      WEnotes(i);
    });
    return false;
  }

  $('head').append('<link href="http://cdnjs.cloudflare.com/ajax/libs/font-awesome/3.1.0/css/font-awesome.min.css" rel="stylesheet" />');
  if ($.browser.msie && parseInt($.browser.version, 10) == 7) {
    $('head').append('<link href="http://cdnjs.cloudflare.com/ajax/libs/font-awesome/3.1.0/css/font-awesome-ie7.min.css" rel="stylesheet" />');
  }
  $('head').append('<link href="/extensions/WEnotes/WEnotes.css" rel="stylesheet" />');
  // only create one Faye client per page
  if (!window.WEFclient) {
    window.WEFclient = new Faye.Client('http://s.oerfoundation.org:80/faye', {
      timeout: 120
    });
    if ($.browser.msie && parseInt($.browser.version, 10) <= 8) {
      window.WEFclient.disable('autodisconnect');
    }
  }
  var client = window.WEFclient;
  var subs = [];
  $('div.WEnotes').each(function(i) {
    var $thisd = $(this);
    var classes = $(this).attr('class').split(/\s+/);
    $.each(classes, function(i, v) {
      if (v.indexOf('WEnotes-') === 0) {
        var tag;
        var args = v.split('-', 3);
        if (args.length === 3) {
          tag = args[2];
          wendivs.push({
            $d: $thisd,
            count: args[1],
            tag: args[2],
            last: '2011-01-01T00:00:00.000Z',
            first: '2999-12-31T23:59:59.999Z',
            moreCount: 20
          });

          subs[i] = client.subscribe('/WEnotes/' +
                    ((tag === '_') ? '*' : tag.toLowerCase()), function(msg) {
            newPost(i, msg);
          });
        }
      }
    });
  });
  $('div.WEnotes,div.WEnotesList').on('click', '.icon-star, .icon-star-empty', like)
              .on('click', '.icon-mail-reply, .icon-th-list', windowConv)
              .on('click', 'a.WEnd', function(event) {
    var id = $(this).attr('id').split('_')[1];
    $.ajax({
      url: weAPI,
      type: 'POST',
      dataType: 'json',
      data: {
        action: 'wenotes',
        noid: id,
        format: 'json'
      },
      success: function() {
      },
      failure: function() {
        alert('unable to delete');
      }
      });
    return false;   // we got this
  });
  $('div.WEnotes').on('WEnotes', WEnotesHandler);
  if (wendivs.length) {
    $('div.WEnotes:first').triggerHandler('WEnotes');
  }
  window.WEnotes.formatMessage = formatMessage;
  window.WEnotes.list = WEnotesList;
  window.WEnotes.top = WEnotesTop;
}());
