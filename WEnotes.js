/* global wgUserName, wgArticleId, Faye */
/* exported WEnotes */
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
var protocol = window.location.protocol + '//';
// hard coded locations of things
var fayeURL = 'faye.oerfoundation.org/faye/';
//var fayeURL = 'faye.dev.oerfoundation.org/faye/';
// scheme, host:port
// include trailing / on URL...
var couchHost = 'couch.oerfoundation.org/', couchDB = 'mentions';
//var couchHost = 'couch.dev.oerfoundation.org/', couchDB = 'mentions';

var msg_counter = [];

(function () {
  var couchURL = protocol + couchHost + couchDB + '/_design/messages/_view/tag_time?',
      couchURLall = protocol + couchHost + couchDB + '/_design/messages/_view/time_unique?',
      couchURLpath = protocol + couchHost + couchDB + '/_design/messages/_view/page_time?',
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
    var url = $(this).closest('.WEnote').find('time').parent().attr('href');
    window.open(url, '_twitter');
    return false;
  }

  function like() {
    var mo, cl, tag = '';
    var id = $(this).closest('.WEnote').attr('id');
    var notliked = $(this).hasClass('icon-star-empty');
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
        vovote: (notliked) ? 1 : 0,
        vopage: wgArticleId
      });
      if (notliked) {
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

  function getFaves(tag) {
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
    var msg, userName, userFullname, i, aspect;
    //var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var sourceProfile = {
      bookmarks: 'https://bookmarks.oeru.org/',
      hypothesis: 'https://hypothes.is/',
      identica: 'https://identi.ca/',
      mastodon: 'https://mastodon.oeru.org/',
      twitter: 'https://twitter.com/',
      wikieducator: protocol + 'WikiEducator.org/User:',
      forums: 'https://forums.oeru.org/u/',
      community: 'https://community.oeru.org/u/',
      saylordiscourse: 'https://discourse.saylor.org/u/',
      connectoeglobal: 'https://connect.oeglobal.org/u/',
      milllforum: 'https://forum.milll.ws/u/'
    };
    var sourceTag = {
      bookmarks: 'https://bookmarks.oeru.org/tags.php/',
      hypothesis: 'https://hypothes.is/earch?q=tag%3A',
      identica: 'https://identi.ca/tag/',
      mastodon: 'https://mastodon.oeru.org/web/timelines/tag/',
      twitter: 'https://twitter.com/#!/search?q=%23',
      wikieducator: protocol + 'WikiEducator.org/',
      connectoeglobal: 'https://connect.oeglobal.org/u/',
      milllforum: 'https://forum.milll.ws/u/'
    };
    // fix changed source tags...
    var source = d.we_source;
    if (source === 'saylor-discourse') source = 'saylordiscourse';
    if (source === 'connect.oeglobal') source = 'connectoeglobal';
    var user = d.user || d.from_user;

    var text = d.text;
    var timeLink = '#';
    var feedURL = false;
    var profileURL = d.profile_url || '#';
    var profileIMG = user.profile_image_url || d.profile_image_url_https || d.profile_image_url ||
        '/extensions/WEnotes/missing.gif';
    userName = user.screen_name || user.username || user;
    userFullname = user.name || d.from_user_name;

    switch (source) {
      case 'bookmarks':
        timeLink = 'https://bookmarks.oeru.org/bookmarks.php/' + user.username + '/' + tag;
        profileURL = user.profile_url;
        profileIMG = 'https://assets.oeru.org/oeru_sscuttle.png';
        // d.created_at is on UTC, not NZ time... so compensate.
        d.created_at = d.we_timestamp;
        break;
      case 'hypothesis':
        feedURL = user.feed_url;
        profileURL = user.profile_url;
        profileIMG = 'https://assets.oeru.org/hypothesis.png';
        timeLink = d.we_link;
        //console.log('(hypothesis) id, _id = ' + d.id + ', ' + d._id);
        //console.log('(hypothesis) tag, we_tags, we_tag = ' + tag + ', ' + d.we_tags + ', ' + d.we_tag);
        break;
      case 'medium':
        feedURL = user.feed_url;
        profileURL = user.profile_url;
        profileIMG = 'https://assets.oeru.org/medium.png';
        timeLink = d.we_link;
        //console.log('(medium) id, _id, profileURL = ' + d.id + ', ' + d._id + ', ' + profileURL);
        break;
      case 'wikieducator':
        profileURL = protocol + 'WikiEducator.org/User:' + user;
        userFullname = userFullname || userName;
        break;
      case 'twitter':
        timeLink = 'https://twitter.com/' + user + '/status/' + d.id_str;
        profileURL = 'https://twitter.com/' + user;
        break;
      case 'identica':
        timeLink = 'https://identi.ca/notice/' + d.id;
        profileURL = user.statusnet_profile_url;
        break;
      case 'mastodon':
        //timeLink = 'https://mastodon.oeru.org/@' + user.screen_name + '/' + d.id;
	      timeLink = d.uri;
        //profileURL = 'https://mastodon.oeru.org/@' + user.screen_name;
	      profileURL = d.profile_url;
        userFullname = user.name || user.screen_name;
        if (userFullname == 'undefined') {
            userFullname = user.screen_name;
        }
        console.log('timeLink = ' + JSON.stringify(timeLink));
        console.log('profileURL = ' + JSON.stringify(profileURL));
        console.log('(mastodon) tag, we_tags, we_tag = ' + tag + ', ' + d.we_tags + ', ' + d.we_tag);
        break;
      case 'feed':
        timeLink = d.we_link;
        break;
      case 'moodle':
      case 'ask':
      case 'groups':
        timeLink = d.we_link;
        break;
      case 'community':
      case 'forums':
      case 'connectoeglobal':
      case 'saylordiscourse':
      case 'milllforum':
        profileURL = d.profile_url.replace('/users/', '/u/'); // change to default Discourse user profile path
        timeLink = d.we_link;
        break;
      case 'chat':
        timeLink = d.url;
        break;
      case 'wenotes_wp':
        userFullname = d.from_user_name;
        userName = d.from_user;
        //timeLink = '<a href="'+d.we_origin_schema+'://'+d.we_origin+'/'+d.we_origin_path+'">'+d.we_source_name+'</a>';
        timeLink = d.we_origin_schema+'://'+d.we_origin+d.we_origin_path;
        break;
    }

    // This text markup routine derived from one
    // Copyright Kent Brewster 2008  CC-BY-SA-3
    // see http://kentbrewster.com/identica-badge for info
    // FIXME unfortunately \w is too lenient when livening URLs
    text = text.replace(/((http|https):\/\/|\!|@|#)(([\w_]+)?[^\s]*)/g,
    //text = text.replace(/((http|https):\/\/|\!|@|#)(([&@#\/%?=~_|!:,.;]+)?[^\s]*)/g,
      function(sub, type, scheme, url, word) {
        var moniker, parts;
        // insights for this next regex: http://www.regular-expressions.info/possessive.html
        var regex = /[.!?;,'")]+$/;
        url = url.replace(regex, '');
        sub = sub.replace(regex, '');
        //console.log("====\nsub:" + sub + "\ntype:" + type +
         // "\nscheme:" + scheme + "\nurl:" + url + "\nword:" + word);
        if(!word) return sub; // just punctuation
        var label = ''; var href = ''; var prefix = ''; var title = '';

        if (word) {
          // special case for WikiEducator user names
          if ((type === '@') && (source === 'wikieducator')) {
            moniker = word;
          } else if ((type === '@') && ((source === 'forums') || (source === 'saylordiscourse') || (source === 'community'))) {
            moniker = word;
          } else if ((type === '@') && (source === 'mastodon')) {
            moniker = '@' + word;
          } else {
            moniker = word.split('_'); // behaviour with underscores differs
            if(type === '#') moniker = moniker.join('');
            else word = moniker = word.toLowerCase();
          }
        }

        switch(type) {
          case 'http://': case 'https://': // html links
            href = scheme + '://' + url;
            break;
          case '@': // link users
            href = sourceProfile[source] + moniker;
            break;
          case '!': // link groups
            href = 'https://identi.ca/group/' + moniker;
            break;
          case '#': // link tags
            href = sourceTag[source] + moniker;
            break;
        }
        if (scheme) { // only urls will have scheme
          label = sub;
          if (sub.length > 32) {
            parts = url.split('/', 2);
            if (parts.length > 1) {
              title = sub;
              label = scheme + '://' + parts[0] + '/' +
                      parts[1].slice(0, 10) + '...';
            }
          }
        } else {
          label = word; prefix = type;
        }
        // only identica has groups
        if ((type === '!') && (source !== 'identica')) {
          return label;
        }
        return prefix + '<a href="' + href + '" ' +
              (title ? 'title="' + title + '" ' : '') +
              'target="_wenotes2">' + label + '</a>';
      });

    // liven abridged marks
    switch (source) {
	    case 'mastodon':
	    case 'identica':
	    case 'bookmarks':
	    case 'hypothesis':
	    case 'medium':
	      text = text.replace(/\.\.\.$/, '<a href="' + timeLink + '">...</a>');
	      break;
	    case 'moodle':
	    case 'ask':
	    case 'feed':
	    case 'groups':
	    case 'community':
	    case 'forums':
	    case 'saylordiscourse':
            case 'connectoeglobal':
	      if (d.truncated) {
		        text = text.substring(0, text.lastIndexOf('...')) +
		        '<a class="external text" href="' + d.we_link +
		        '" target="_wenotes">...</a>';
	      }
	      break;
    }

    // if we don't have a profile img or url, use gravatar if available
    if (((profileIMG === '') ||
        (profileIMG === '/extensions/WEnotes/missing.gif')) && d.gravatar) {
      profileIMG = 'https://www.gravatar.com/avatar/' + d.gravatar
         + '?s=48&d=identicon';
    }
    if ((profileURL === '') && d.gravatar) {
      profileURL = 'https://www.gravatar.com/' + d.gravatar;
    }
    //
    // set up the actual message published in the feed for each mention
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
    var mo = profileIMG.match(/https:\/\/wikieducator\.org\/.*?\/(\d+)px-[^\/]+/i);
    //var mo = profileIMG.match(/(http|https):\/\/wikieducator\.org\/.*?\/(\d+)px-[^\/]+/i);
    /*if (protocol == 'https://') {
      mo = mo.replace('http:','https:');
    }*/
    if (mo) {
      imgwidth = mo[1];
    }
    if ((imgwidth > 48) || (imgheight > 48)) {
      if (imgwidth > imgheight) {
        aspect = imgheight/imgwidth;
        imgwidth = Math.min(imgwidth, 48);
        imgheight = Math.round(imgheight * aspect);
      } else {
        aspect = imgwidth/imgheight;
        imgheight = Math.min(imgheight, 48);
        imgwidth = Math.round(imgwidth * aspect);
      }
    }
    msg += 'src="' + profileIMG +
      '" height=' + imgheight +
      ' width=' + imgwidth + '></a></div><div class="WEnotebody">';
    msg += '<a href="' + profileURL + '" style="text-decoration: none;">' +
      '<b>' + userFullname + '</b>&nbsp;&nbsp;<span class="WEnoteuser">' +
      '@' + userName + '</a></span>';
    // include an RSS Feed Icon link if a feed is defined
    if (feedURL) {
      feedIcon = '<img src="https://assets.oeru.org/rss_mini.png" alt="RSS feed URL for this person" />';
      msg += '&nbsp;&nbsp;<a href="' + feedURL + '">' + feedIcon + '</a>';
    }
    msg += '<br />';
    msg += text;
    var lang = getLang();
    //var dt = new Date(d.created_at);
    //console.log('in flow, got lang '+lang);
    var created_date = getDate(d.created_at, lang);
    var iso_date = getISODate(d.created_at);
    //var ago_date = getTimeago(d.created_at, lang);
    console.log('created date is '+ created_date);

    //var dt_ago = '<time class="timeago" datetime="'+iso_date+'" title="'+created_date+'">'+created_date+'</time>';
    var dt_ago = '<time class="timeago" datetime="'+iso_date+'">'+created_date+'</time>';
    msg += '<br /><span class="WEnotesub">';
    console.log('.... dt_ago = '+dt_ago);
    if (tag === '_') {
      if (d.we_tags) {
        //console.log('%%% type = ' + d.we_source + ' num tags = ' + d.we_tags.length);
        msg += '<span class="WEtags">';
        for (i=0; i<d.we_tags.length; i++) {
          msg += '#' + d.we_tags[i] + '&nbsp;';
        }
      }
      msg += '</span>';
      msg += '&nbsp;&nbsp;';
    }
    if (d.we_source === 'feed') {
      msg += '<span title="' + d.we_feed + '">blog</span>';
    } else if (d.we_source === 'wenotes_wp' || d.we_source === 'course') {
      //console.log('figuring out source attribution: ', d);
      var coursesite = 'course.oeru';
      if (typeof d.we_source_url != 'undefined') {
         // console.log('we have a source_url: ', d.we_source_url);
    	  if (d.we_source_url === 'course.oeglobal.org') {
    	      coursesite = 'course.oeglobal';
          } else if (d.we_source_url === 'pacificopencourses.col.org') {
              coursesite = 'pacificcourse.col';
    	  } else {
    	      coursesite = 'course.oeru';
          }
      }
      //console.log('we got a message: ', coursesite);
      msg += coursesite;
    } else if (d.we_source === 'groups') {
      msg += 'groups.oeru';
    } else if (d.we_source === 'community') {
      msg += 'community.oeru';
    } else if (d.we_source === 'forums') {
      msg += 'forums.oeru';
    } else if (d.we_source === 'saylordiscourse') {
      msg += 'forums.saylor';
    } else if (d.we_source === 'connectoeglobal') {
      msg += 'connect.oeglobal';
    } else if (d.we_source === 'mastodon') {
      msg += 'mastodon.oeru';
    } else if (d.we_source === 'hypothesis') {
      msg += 'hypothes.is';
      //console.log("*** id = " + d.id);
      //console.log("dt = " + dt + ", dt_ago = " + dt_ago);
    } else {
      msg += d.we_source;
    }
    msg += '&nbsp;&nbsp;&nbsp;<a href="' + timeLink +
      '" title="' + created_date + '" style="text-decoration: none;" target="_wenotes">' +
      dt_ago + '</a>';
    if (!novoting && wgUserName) {
      msg += '&nbsp;&nbsp;&nbsp;<i title="favorite" class="icon-star-empty"></i>';
    }
    msg += '&nbsp;<span class="wevtct"></span>';
    // add the "sysop-only" links to view the mention in the db, or delete it
    if ($.inArray('sysop', window.wgUserGroups) > -1) {
      msg += '&nbsp;&nbsp;&nbsp;' +
        //'<a href="' + protocol + couchHost + '_utils/document.html?' +
        '<a href="' + protocol + couchHost + '_utils/#database/' +
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
    //console.log("options = " + JSON.stringify(options));
    for (i in options) {
      if (options.hasOwnProperty(i)) {
        optionList.push(i + '=' + encodeURIComponent(options[i]));
      }
    }
    //console.log("OptionList = " + JSON.stringify(optionList.join('&')));
    return optionList.join('&');
  }

  // find the current language setting, if any. Otherwise, return en_EN...
  function getLang() {
    console.log('in getLang');
    var wenlang = 'en_NZ';
    $('div.WEnotes').each(function() {
      var $details = $(this).attr('class').split(/\s+/);
      $.each($details, function(i, v) {
        if (v.indexOf('WEnotes-') === 0) {
          console.log('+++++ v = ', v);
          var args = v.split('-');
          //console.log('+++++ args = '+JSON.stringify(args));
          if (args.length > 3) {
 	          wenlang = (args[4] !== '') ? args[4] : 'en_NZ';
            console.log('found lang = '+wenlang);
            if (wenlang == 'fr_FR') {
              $.extend($.timeago.settings.strings = {
                   // environ ~= about, it's optional
                   prefixAgo: "il y a",
                   prefixFromNow: "d'ici",
                   seconds: "moins d'une minute",
                   minute: "environ une minute",
                   minutes: "environ %d minutes",
                   hour: "environ une heure",
                   hours: "environ %d heures",
                   day: "environ un jour",
                   days: "environ %d jours",
                   month: "environ un mois",
                   months: "environ %d mois",
                   year: "un an",
                   years: "%d ans"
              });
            }
          }
        }
      });
    });
    return wenlang;
  }

  function getISODate(date) {
    var dt = new Date(date); // create date object
    return dt.toISOString();
  }

  function getDate(date, lang) {
    var dt = new Date(date); // create date object
    lang = (typeof lang !== 'undefined') ? lang.replace('_','-') : 'en-EN';
    //console.log('in getDate, lang is '+lang);
    const options = {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'};
    return dt.toLocaleDateString(lang, options);
  }

  function getMore(event) {
    //console.log('in getMore');
    var options, url;
    var ix = event.data.ix,
        tag = wendivs[ix].tag,
        taglc = tag.toLowerCase(),
        count = wendivs[ix].moreCount + 1,
        $wenm = $('#WEnotesMore' + ix),
        $wenmdi = $('#WEnotesMoreDiv' + ix + ' img');
    $wenmdi.show();
    $wenm.hide();
    if (tag === '_') {
      url = couchURLall;
      //console.log('startkey: ' + wendivs[ix].first);
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
          $wenmdi.hide();
          $wenm.show();
        },
        success: function(data) {
          //console.log(JSON.stringify(data));
          var i, d,
              mid = '#WEnotesMoreDiv' + ix,
              rows = data.rows;
          // FIXME ignore first row which is a duplicate of current "first"
          //  to avoid having to calculate first - 0.001
          // check if we are at the end of the database
          if (rows.length <= 1) {
            $(mid).hide();
            return;
          }
          var lang = getLang();
          console.log('in CouchReturn, got lang '+lang);
          for (i=1; i < rows.length; i++) {
            d = rows[i].doc;
            if (d.we_timestamp > wendivs[ix].last) {
              wendivs[ix].last = d.we_timestamp;
            }
            if (d.we_timestamp < wendivs[ix].first) {
              wendivs[ix].first = d.we_timestamp;
            }
            $(mid).before(formatMessage(d, tag));
            $('#WEitf'+d._id).find('time.timeago').timeago();
            //$(lid).effect("highlight", {}, 1500);
          }
          $wenmdi.hide();
          $wenm.show();
          wendivs[ix].moreCount += 20;
        }
    });
    return false;
  }

  function WEnotes(ix) {
    var url, options, ids=[];
    var dx = wendivs[ix];
    var tag = dx.tag || 'wikieducator';
    var newstylepage = false;
    var taglc = tag.toLowerCase();
    var count = dx.count || 20;
    // exploits knowing the milliseconds of all we_timestamp = .000i
    var lastplus = dx.last.slice(0, -2) + '1Z';
    if (dx.timer) {
      clearTimeout(dx.timer);
    }
    var refreshtime = 30000;

    // if both site_id and path_id are defined in the current scope, we've got
    // a new-style page
    if (typeof site_id !== 'undefined' && typeof path_id !== 'undefined' ) {
        newstylepage = true;
    }

    if (tag === '_') {
      url = couchURLall;
      options = {
        endkey: '"' + lastplus + '"',
        descending: true,
        include_docs: true,
        limit: count
      };
    } else if (newstylepage) {
      console.log("!!! we're looking at a new style page!");
      url = couchURLpath;
      page = site_id + '-' + path_id;
      options = {
        key: '["' + page + '"]',
        startkey: '["' + page + '",{}]',
        endkey: '["' + page + '", "' + lastplus + '"]',
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
          //console.log("data = " + JSON.stringify(data));
          //console.log('current setting for wenlang '+ wenlang);
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
            //console.log('language for wendivs '+ix+' is ', data.language);
            if (getLang() == 'fr_FR') {
              button_text = "Des notes plus " + tag;
              if (tag === '_') {
                button_text = "Plus de notes";
              }
	            console.log('chose fr_FR: '+button_text);
            } else {
              button_text = "More " + tag + " notes";
              if (tag === '_') {
                button_text = "More notes";
	            }
	            console.log('chose not-fr_FR: '+button_text);
      	    }
            $(lid).after('<div class="WEnotesMore" id="WEnotesMoreDiv' +
              ix +'"><img src="' + protocol + 'wikieducator.org/skins/common/images/ajax-loader.gif" />' +
              '<input id="WEnotesMore' + ix +
              '" type="submit" value="' + button_text + '" />' +
              '</div><br clear="all" />');
            $('#WEnotesMore' + ix).bind('click', { ix: ix }, getMore);
          }
          for (i=0; i<rows.length; i++) {
            var d = rows[i].doc;
            if (typeof msg_counter[d.id] === 'undefined') {
               msg_counter[d.id] = 0;
            }
            msg_counter[d.id] = msg_counter[d.id] + 1;
            //console.log('looking at id = ' + d.id + ' counter = ' + msg_counter[d.id]);
            // we've seen this message before, don't show it again!
            if (msg_counter[d.id] > 1) {
              //console.log('whoa! Something funny going on with ' + d.id);
              continue;
            }
            if (d.we_timestamp > wendivs[ix].last) {
              wendivs[ix].last = d.we_timestamp;
            }
            if (d.we_timestamp < wendivs[ix].first) {
              wendivs[ix].first = d.we_timestamp;
            }
            $(lid).after(formatMessage(d, tag));
            lid = '#WEitf' + d._id;
            $(lid).find('time.timeago').timeago();
            ids.push(d._id);
          }
          //console.log('ids = ' + JSON.stringify(ids));
          /* to stay at fixed length
          while ($(did + ' > div').length > count) {
            $(did + ' > div:last').remove();
          }
          */
          getFaves(tag);
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
        //console.log('in WEnotesTop!');
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

  // FIXME: describe what this method really does...
  function newPost(i, message) {
    //console.log('in newPost');
    // ignore design updates
    if (message._id.charAt(0) === '_') {
      return;
    }
    // FIXME keep a local cache of IDs rather than querying DOM?
    if ($('#WEitf' + message._id).length === 0) {
      if (!message.we_d) {   // don't show new deletions
        var wd = wendivs[i-1];
        wd.$d.prepend(formatMessage(message, wd.tag));
        $('#WEitf'+ message._id).find('time.timeago').timeago();
      }
    } else { // we've seen this message, is it going away?
      if (message.we_d) {
        $('#WEitf' + message._id).hide('fast');
      }
    }
  }

  function WEnotesHandler(event, tag) {
    $.each(wendivs, function (i, v) {
      //debug.log('iterating through wendivs', i, v);
      if (tag && v.tag !== tag) {
        return;
      }
      WEnotes(i);
    });
    return false;
  }

  // return MSIE major version number (or null)
  function msieVersion() {
    var m = /MSIE (\d+)/.exec(navigator.userAgent);
    if (m) {
      return parseInt(m[1], 10);
    }
    return null;
  }


  // start the WEnotes process
  //console.log('starting WEnotes...');

  var msie = msieVersion();
  $('head').append('<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/3.1.0/css/font-awesome.min.css" rel="stylesheet" />');
  if (msie === 7) {
    $('head').append('<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/3.1.0/css/font-awesome-ie7.min.css" rel="stylesheet" />');
  }
  $('head').append('<link href="https://wikieducator.org/extensions/WEnotes/WEnotes.css" rel="stylesheet" />');
  // only create one Faye client per page
  if (!window.WEFclient) {
    window.WEFclient = new Faye.Client(protocol + fayeURL, {
      timeout: 120
    });
    if (msie <= 8) {
      window.WEFclient.disable('autodisconnect');
    }
  }
  // rename this for brevity
  var client = window.WEFclient;
  // to hold individual subscriptions
  var subs = [];
  // for each WEnotes instance on the page
  console.log("==== looking for WEnotes class...");
  $('div.WEnotes').each(function() {
    var $thisd = $(this);
    // get the other classes alongside WEnotes, e.g. WEnotes-20-lida101-lida-fr_FR
    var classes = $(this).attr('class').split(/\s+/);
    // for each class, get useful info out of the class name
    // in the example above, 20 is the 'count' of messages to show,
    // and lida101 is the tag, lida is the 'context', and fr_FR is the language
    $.each(classes, function(i, v) {
      //console.log('==== v = ', v);
      if (v.indexOf('WEnotes-') === 0) {
        var tag;
        var args = v.split('-', 5);
        if (args.length > 2) {
          tag = args[2];
          // add each class' details to a list for future reference
          wendivs.push({
            $d: $thisd,
            count: args[1], // how many of this to show
            tag: tag, // from which tag
	          context: args[3],
            language: args[4],
            last: '2011-01-01T00:00:00.000Z',
            first: '2999-12-31T23:59:59.999Z',
            moreCount: 20  // how many more to show if the user clicks "show more"
          });

 	        wenlang = args[4];
	        console.log('wenlang for WEnote: '+wenlang);
          // actually subscribe to the Faye services for the relevant combo
          combo = '/WEnotes/' + ((tag === '_') ? '*' : tag.toLowerCase());
          console.log('combo = ', combo);
          subs[i] = client.subscribe(combo, function(msg) {
            console.log('i = ', i);
            console.log('msg = ', msg);
            newPost(i, msg);
          });
        }
      }
    });
  });
  $('div.WEnotes,div.WEnotesList').on('click', '.icon-star, .icon-star-empty', like)
              .on('click', '.icon-mail-reply, .icon-th-list', windowConv)
              .on('click', 'a.WEnd', function() {
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
        console.log('deleting mention designated by ' + id);
      },
      failure: function() {
        alert('unable to delete');
      }
      });
    return false;   // we got this
  });
  $('div.WEnotes').on('WEnotes', WEnotesHandler);
  if (wendivs.length) {
    console.log('wendivs has length '+wendivs.length);
    $('div.WEnotes:first').triggerHandler('WEnotes');
  }
  window.WEnotes.formatMessage = formatMessage;
  window.WEnotes.list = WEnotesList;
  window.WEnotes.top = WEnotesTop;
}());
