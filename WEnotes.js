/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 0.11.3
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2012, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */
(function($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else if (typeof timestamp === "number") {
      return inWords(new Date(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowFuture: false,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },
    inWords: function(distanceMillis) {
      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;

      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }

      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 42 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 45 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute($l.year, 1) ||
        substitute($l.years, Math.round(years));

      var separator = $l.wordSeparator === undefined ?  " " : $l.wordSeparator;
      return $.trim([prefix, words, suffix].join(separator));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d\d\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      return new Date(s);
    },
    datetime: function(elem) {
      var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    },
    isTime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
    }
  });

  $.fn.timeago = function() {
    var self = this;
    self.each(refresh);

    var $s = $t.settings;
    if ($s.refreshMillis > 0) {
      setInterval(function() { self.each(refresh); }, $s.refreshMillis);
    }
    return self;
  };

  function refresh() {
    var data = prepareData(this);
    if (!isNaN(data.datetime)) {
      $(this).text(inWords(data.datetime));
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}(jQuery));

/* shim for toISOString()
 */

if ( !Date.prototype.toISOString ) {
  ( function() {
    function pad(number) {
      var r = String(number);
      if ( r.length === 1 ) {
        r = '0' + r;
      }
      return r;
    }
 
    Date.prototype.toISOString = function() {
      return this.getUTCFullYear()
        + '-' + pad( this.getUTCMonth() + 1 )
        + '-' + pad( this.getUTCDate() )
        + 'T' + pad( this.getUTCHours() )
        + ':' + pad( this.getUTCMinutes() )
        + ':' + pad( this.getUTCSeconds() )
        + '.' + String( (this.getUTCMilliseconds()/1000).toFixed(3) ).slice( 2, 5 )
        + 'Z';
      };
  
  }() );
}

/* WEnotes widget
 * Copyright 2012 Open Education Resource Foundation
 * Available under CC-BY-SA license.
 */

  // variables made public to simplify debugging/monitoring
  var wendivs = [];
  var weavatars = {
  };
  var thumbnailsNeeded = [];

(function () {

  // scheme, host:port
  var couchHost = 'http://wikieducator.iriscouch.com/';
  var couchURL = couchHost + 'mentions/_design/messages/_view/tag_time?';

  function formatMessage(d) {
    var msg;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var serverProfile = {
      twitter: 'http://twitter.com/',
      identica: 'http://identi.ca/',
      wikieducator: 'http://WikiEducator.org/User:'
    };
    var serverTag = {
      twitter: 'http://twitter.com/#!/search?q=%23',
      identica: 'http://identi.ca/tag/',
      wikieducator: 'http://WikiEducator.org/'
    };
    var id = d.id;
    var user = d.user || d.from_user;
    var server = d.we_source;
    var timeLink = '#';
    switch (server) {
    case 'twitter':
      timeLink = 'http://twitter.com/#!/' + user + '/status/' + d.id_str;
      break;
    case 'identica':
      timeLink = 'http://identi.ca/notice/' + d.id;
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
    var text = d.text.replace(/((http|https):\/\/|\!|@|#)(([\w_]+)?[^\s]*)/g,
      function(sub, type, scheme, url, word, offset, full) {
        var moniker;
        //debug.log("====\nsub:" + sub + "\ntype:" + type + "\nscheme:" + scheme + "\nurl:" + url + "\nword:" + word);
        if(!word) return sub; // just punctuation
        var label = ''; var href = ''; var prefix = '';

        if (word) {
          // special case for WikiEducator user names
          if ((type === '@') && (server === 'wikieducator')) {
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
            href = serverProfile[server] + moniker; break;
          case '!': // link groups
            href = 'http://identi.ca/group/' + moniker;
            break;
          case '#': // link tags
            href = serverTag[server] + moniker;
            break;
        }
        if (scheme) { // only urls will have scheme
          label = sub;
        } else {
          label = word; prefix = type;
        }
        // only identica has groups
        if ((type === '!') && (server !== 'identica')) {
          return label;
        }
        return prefix+'<a href="' + href + '" target="_identica">' + label + '</a>';
      });

    if (server === 'identica') {
      text = text.replace(/\.\.\.$/, '<a href="' + timeLink + '">...</a>');
    }
    msg = '<div id="WEitf' + id + '" style="margin: 2px;">';
    var profileURLprefix = (d.we_source === "twitter") ? 'http://twitter.com/' : 'http://WikiEducator.org/User:';
    var profileURL;
    if ((d.we_source === 'moodle') || (d.we_source === 'ask')) {
      profileURL = d.profile_url;
    } else {
      profileURL = user.statusnet_profile_url || profileURLprefix + user;
    }
    var profileIMG = user.profile_image_url || d.profile_image_url;
    if (d.we_source === 'wikieducator') {
      //debug.log('weavatars', weavatars);
      if (d.from_user in weavatars) {
        if (weavatars[d.from_user].url) {
          //debug.log('have an avatar for ' + d.from_user + ': ' + weavatars[d.from_user].url);
          profileIMG = weavatars[d.from_user].url;
          msg += '<div style="float: left; width: 48px; height: 48px;"><a href="' + profileURL + '"><img src="' + profileIMG + '" border=0 style="float: right;"></a></div><div style="margin-left: 53px;">';
        } else {
          // cached a "don't know" value for the thumbnail
          //debug.log('need thumbnail for ' + d.from_user + ': ' + weavatars[d.from_user].file);
          msg += '<div style="float: left; width: 48px; height: 48px;"><a href="' + profileURL + '"><img class="' + d.from_user.replace(/ /g, '_') + '" src="' + profileIMG + '" border=0 style="float: right;"></a></div><div style="margin-left: 53px;">';
        }
      } else {
        if ($.inArray(d.from_user, thumbnailsNeeded) === -1) {
          thumbnailsNeeded.push(d.from_user);
        }
        msg += '<div style="float: left; width: 48px; height: 48px;"><a href="' + profileURL + '"><img class="' + d.from_user.replace(/ /g, '_') + '" src="' + profileIMG + '" border=0 style="float: right;"></a></div><div style="margin-left: 53px;">';
      }
    } else {
      msg += '<a href="' + profileURL + '"><img src="' + profileIMG + '" border=0 style="float: left;" height=48 width=48></a><div style="margin-left: 53px;">';
    }
    var userName = user.screen_name || user;
    var userFullname = user.name || d.from_user_name;
    msg += '<a href="' + profileURL + '" style="text-decoration: none;"><b>' + userName + '</b></a>&nbsp;&nbsp;<span style="color:#999;">' + userFullname + '</span><br />';
    if (((d.we_source === 'moodle') || (d.we_source ==='ask')) && d.truncated) {
      text = text.substring(0, text.lastIndexOf('...')) + '<a class="external text" href="' + d.we_link + '">...</a>';
    }
    msg += text;
    var dt = new Date(d.created_at);
    var dt_read = dt.getUTCDate() + ' ' + months[dt.getUTCMonth()];
    var dt_ago = '<abbr class="timeago" title="' + dt.toISOString() + '">' + dt.getUTCDate() + ' ' + months[dt.getUTCMonth()] + '</abbr>';
    msg += '<br /><span style="color: #999; font-size: smaller;">' + d.we_source + '&nbsp;&nbsp;&nbsp;<a href="' + timeLink + '" title="' + dt.toUTCString() + '" style="text-decoration: none;">' + dt_ago + '</a>';
    if ($.inArray('sysop', wgUserGroups) > -1) {
      msg += '&nbsp;&nbsp;&nbsp;<a href="http://wikieducator.iriscouch.com:5984/_utils/#/mentions/' + d._id + '">db</a>';
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

  function getThumbnails() {
    var couchURL = couchHost + 'weavatars/_all_docs?',
        options = {
          keys: '["' + thumbnailsNeeded.join('","') + '"]',
          include_docs: true
        };
    $.ajax({
      url: couchURL + makeCouchqs(options),
      cache: false,
      dataType: 'jsonp',
      success: function(data) {
        var i, url, user, userUnderscore;
        for (i = 0; i < data.rows.length; i++) {
          if (data.rows[i].error) {
            url = '';
            user = data.rows[i].key;
          } else {
            url = data.rows[i].doc.url;
            user = data.rows[i].id;
          }
          weavatars[user] = {};
          weavatars[user].url = url;
          if (url) {
            userUnderscore = data.rows[i].id.replace(/ /g, '_');
            $('img.' + userUnderscore).attr('src', url);
          }
        }
        thumbnailsNeeded = [];
      }
    });
  }

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
            $('#WEitf'+id).find('abbr.timeago').timeago();
            //$(lid).effect("highlight", {}, 1500);
          }
          if (thumbnailsNeeded.length) {
            getThumbnails();
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
          dx.timer = setTimeout(function() {$('div.WEnotes:first').triggerHandler('WEnotes', [dx.tag]);}, refreshtime);
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
            $(lid).after('<div id="WEnotesMoreDiv' + ix +'"><div style="float: left; margin-left: 53px; margin-bottom: 1em; background-color: #f9f9f9; border: 1px solid #aaaaaa; padding: 5px;"><img src="/skins/common/images/Ajax-loader.gif" style="fload: left; visibility: hidden;" height="16" width="16" /><a id="WEnotesMore' + ix + '" style="margin-right: 16px;">More ' + tag + ' notes</a></div></div><br clear="all" />');
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
            lid = '#WEitf' + id;
            $(lid).find('abbr.timeago').timeago();
            //$(lid).effect("highlight", {}, 1500);
          }
          /* to stay at fixed length
          while ($(did + ' > div').length > count) {
            $(did + ' > div:last').remove();
          }
          */
          if (thumbnailsNeeded.length) {
            getThumbnails();
          }

          dx.timer = setTimeout(function() {$('div.WEnotes:first').triggerHandler('WEnotes', [dx.tag]);}, refreshtime);
        }
    });
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

  //debug.log('WENotes!');
  $('div.WEnotes').each(function(i) {
    var $thisd = $(this);
    var classes = $(this).attr('class').split(/\s+/);
    $.each(classes, function(i, v) {
      if (v.indexOf('WEnotes-') === 0) {
        var args = v.split('-', 3);
        if (args.length === 3) {
          wendivs.push({
            $d: $thisd,
            count: args[1],
            tag: args[2],
            last: '2011-01-01T00:00:00.000Z',
            first: '2999-12-31T23:59:59.999Z',
            moreCount: 20
          });
        }
      }
    });
  });
  $('div.WEnotes').on('WEnotes', WEnotesHandler);
  if (wendivs.length) {
    $('div.WEnotes:first').triggerHandler('WEnotes');
  }
}());
