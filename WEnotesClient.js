/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 1.6.7
 * @requires jQuery >=1.5.0 <4.0
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2019, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && typeof module.exports === 'object') {
    factory(require('jquery'));
  } else {
    // Browser globals
    factory(jQuery);
  }
}(function ($) {
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
      allowPast: true,
      allowFuture: false,
      localeTitle: false,
      cutoff: 0,
      autoDispose: true,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        inPast: 'any moment now',
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
      if (!this.settings.allowPast && ! this.settings.allowFuture) {
          throw 'timeago allowPast and allowFuture settings can not both be set to false.';
      }

      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      if (!this.settings.allowPast && distanceMillis >= 0) {
        return this.settings.strings.inPast;
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

      var separator = $l.wordSeparator || "";
      if ($l.wordSeparator === undefined) { separator = " "; }
      return $.trim([prefix, words, suffix].join(separator));
    },

    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      s = s.replace(/([\+\-]\d\d)$/," $100"); // +09 -> +0900
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

  // functions that can be called via $(el).timeago('action')
  // init is default when no action is given
  // functions are called with context of a single element
  var functions = {
    init: function() {
      functions.dispose.call(this);
      var refresh_el = $.proxy(refresh, this);
      refresh_el();
      var $s = $t.settings;
      if ($s.refreshMillis > 0) {
        this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
      }
    },
    update: function(timestamp) {
      var date = (timestamp instanceof Date) ? timestamp : $t.parse(timestamp);
      $(this).data('timeago', { datetime: date });
      if ($t.settings.localeTitle) {
        $(this).attr("title", date.toLocaleString());
      }
      refresh.apply(this);
    },
    updateFromDOM: function() {
      $(this).data('timeago', { datetime: $t.parse( $t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title") ) });
      refresh.apply(this);
    },
    dispose: function () {
      if (this._timeagoInterval) {
        window.clearInterval(this._timeagoInterval);
        this._timeagoInterval = null;
      }
    }
  };

  $.fn.timeago = function(action, options) {
    var fn = action ? functions[action] : functions.init;
    if (!fn) {
      throw new Error("Unknown function name '"+ action +"' for timeago");
    }
    // each over objects here and call the requested function
    this.each(function() {
      fn.call(this, options);
    });
    return this;
  };

  function refresh() {
    var $s = $t.settings;

    //check if it's still visible
    if ($s.autoDispose && !$.contains(document.documentElement,this)) {
      //stop if it has been removed
      $(this).timeago("dispose");
      return this;
    }

    var data = prepareData(this);

    if (!isNaN(data.datetime)) {
      if ( $s.cutoff === 0 || Math.abs(distance(data.datetime)) < $s.cutoff) {
        $(this).text(inWords(data.datetime));
      } else {
        if ($(this).attr('title').length > 0) {
            $(this).text($(this).attr('title'));
        }
      }
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if ($t.settings.localeTitle) {
        element.attr("title", element.data('timeago').datetime.toLocaleString());
      } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
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
}));
'use strict';

var Faye = {
  VERSION:          '0.8.9',

  BAYEUX_VERSION:   '1.0',
  ID_LENGTH:        160,
  JSONP_CALLBACK:   'jsonpcallback',
  CONNECTION_TYPES: ['long-polling', 'cross-origin-long-polling', 'callback-polling', 'websocket', 'eventsource', 'in-process'],

  MANDATORY_CONNECTION_TYPES: ['long-polling', 'callback-polling', 'in-process'],

  ENV: (typeof global === 'undefined') ? window : global,

  extend: function(dest, source, overwrite) {
    if (!source) return dest;
    for (var key in source) {
      if (!source.hasOwnProperty(key)) continue;
      if (dest.hasOwnProperty(key) && overwrite === false) continue;
      if (dest[key] !== source[key])
        dest[key] = source[key];
    }
    return dest;
  },

  random: function(bitlength) {
    bitlength = bitlength || this.ID_LENGTH;
    if (bitlength > 32) {
      var parts  = Math.ceil(bitlength / 32),
          string = '';
      while (parts--) string += this.random(32);
      var chars = string.split(''), result = '';
      while (chars.length > 0) result += chars.pop();
      return result;
    }
    var limit   = Math.pow(2, bitlength) - 1,
        maxSize = limit.toString(36).length,
        string  = Math.floor(Math.random() * limit).toString(36);

    while (string.length < maxSize) string = '0' + string;
    return string;
  },

  clientIdFromMessages: function(messages) {
    var first = [].concat(messages)[0];
    return first && first.clientId;
  },

  copyObject: function(object) {
    var clone, i, key;
    if (object instanceof Array) {
      clone = [];
      i = object.length;
      while (i--) clone[i] = Faye.copyObject(object[i]);
      return clone;
    } else if (typeof object === 'object') {
      clone = (object === null) ? null : {};
      for (key in object) clone[key] = Faye.copyObject(object[key]);
      return clone;
    } else {
      return object;
    }
  },

  commonElement: function(lista, listb) {
    for (var i = 0, n = lista.length; i < n; i++) {
      if (this.indexOf(listb, lista[i]) !== -1)
        return lista[i];
    }
    return null;
  },

  indexOf: function(list, needle) {
    if (list.indexOf) return list.indexOf(needle);

    for (var i = 0, n = list.length; i < n; i++) {
      if (list[i] === needle) return i;
    }
    return -1;
  },

  map: function(object, callback, context) {
    if (object.map) return object.map(callback, context);
    var result = [];

    if (object instanceof Array) {
      for (var i = 0, n = object.length; i < n; i++) {
        result.push(callback.call(context || null, object[i], i));
      }
    } else {
      for (var key in object) {
        if (!object.hasOwnProperty(key)) continue;
        result.push(callback.call(context || null, key, object[key]));
      }
    }
    return result;
  },

  filter: function(array, callback, context) {
    var result = [];
    for (var i = 0, n = array.length; i < n; i++) {
      if (callback.call(context || null, array[i], i))
        result.push(array[i]);
    }
    return result;
  },

  asyncEach: function(list, iterator, callback, context) {
    var n       = list.length,
        i       = -1,
        calls   = 0,
        looping = false;

    var iterate = function() {
      calls -= 1;
      i += 1;
      if (i === n) return callback && callback.call(context);
      iterator(list[i], resume);
    };

    var loop = function() {
      if (looping) return;
      looping = true;
      while (calls > 0) iterate();
      looping = false;
    };

    var resume = function() {
      calls += 1;
      loop();
    };
    resume();
  },

  // http://assanka.net/content/tech/2009/09/02/json2-js-vs-prototype/
  toJSON: function(object) {
    if (this.stringify)
      return this.stringify(object, function(key, value) {
        return (this[key] instanceof Array)
            ? this[key]
            : value;
      });

    return JSON.stringify(object);
  },

  logger: function(message) {
    if (typeof console !== 'undefined') console.log(message);
  },

  timestamp: function() {
    var date   = new Date(),
        year   = date.getFullYear(),
        month  = date.getMonth() + 1,
        day    = date.getDate(),
        hour   = date.getHours(),
        minute = date.getMinutes(),
        second = date.getSeconds();

    var pad = function(n) {
      return n < 10 ? '0' + n : String(n);
    };

    return pad(year) + '-' + pad(month) + '-' + pad(day) + ' ' +
           pad(hour) + ':' + pad(minute) + ':' + pad(second);
  }
};

if (typeof window !== 'undefined')
  window.Faye = Faye;


Faye.Class = function(parent, methods) {
  if (typeof parent !== 'function') {
    methods = parent;
    parent  = Object;
  }

  var klass = function() {
    if (!this.initialize) return this;
    return this.initialize.apply(this, arguments) || this;
  };

  var bridge = function() {};
  bridge.prototype = parent.prototype;

  klass.prototype = new bridge();
  Faye.extend(klass.prototype, methods);

  return klass;
};


Faye.Namespace = Faye.Class({
  initialize: function() {
    this._used = {};
  },

  exists: function(id) {
    return this._used.hasOwnProperty(id);
  },

  generate: function() {
    var name = Faye.random();
    while (this._used.hasOwnProperty(name))
      name = Faye.random();
    return this._used[name] = name;
  },

  release: function(id) {
    delete this._used[id];
  }
});


Faye.Error = Faye.Class({
  initialize: function(code, params, message) {
    this.code    = code;
    this.params  = Array.prototype.slice.call(params);
    this.message = message;
  },

  toString: function() {
    return this.code + ':' +
           this.params.join(',') + ':' +
           this.message;
  }
});

Faye.Error.parse = function(message) {
  message = message || '';
  if (!Faye.Grammar.ERROR.test(message)) return new this(null, [], message);

  var parts   = message.split(':'),
      code    = parseInt(parts[0]),
      params  = parts[1].split(','),
      message = parts[2];

  return new this(code, params, message);
};

Faye.Error.versionMismatch = function() {
  return new this(300, arguments, "Version mismatch").toString();
};
Faye.Error.conntypeMismatch = function() {
  return new this(301, arguments, "Connection types not supported").toString();
};
Faye.Error.extMismatch = function() {
  return new this(302, arguments, "Extension mismatch").toString();
};
Faye.Error.badRequest = function() {
  return new this(400, arguments, "Bad request").toString();
};
Faye.Error.clientUnknown = function() {
  return new this(401, arguments, "Unknown client").toString();
};
Faye.Error.parameterMissing = function() {
  return new this(402, arguments, "Missing required parameter").toString();
};
Faye.Error.channelForbidden = function() {
  return new this(403, arguments, "Forbidden channel").toString();
};
Faye.Error.channelUnknown = function() {
  return new this(404, arguments, "Unknown channel").toString();
};
Faye.Error.channelInvalid = function() {
  return new this(405, arguments, "Invalid channel").toString();
};
Faye.Error.extUnknown = function() {
  return new this(406, arguments, "Unknown extension").toString();
};
Faye.Error.publishFailed = function() {
  return new this(407, arguments, "Failed to publish").toString();
};
Faye.Error.serverError = function() {
  return new this(500, arguments, "Internal server error").toString();
};


Faye.Deferrable = {
  callback: function(callback, context) {
    if (!callback) return;

    if (this._deferredStatus === 'succeeded')
      return callback.apply(context, this._deferredArgs);

    this._callbacks = this._callbacks || [];
    this._callbacks.push([callback, context]);
  },

  timeout: function(seconds, message) {
    var _this = this;
    var timer = Faye.ENV.setTimeout(function() {
      _this.setDeferredStatus('failed', message);
    }, seconds * 1000);
    this._timer = timer;
  },

  errback: function(callback, context) {
    if (!callback) return;

    if (this._deferredStatus === 'failed')
      return callback.apply(context, this._deferredArgs);

    this._errbacks = this._errbacks || [];
    this._errbacks.push([callback, context]);
  },

  setDeferredStatus: function() {
    if (this._timer)
      Faye.ENV.clearTimeout(this._timer);

    var args   = Array.prototype.slice.call(arguments),
        status = args.shift(),
        callbacks;

    this._deferredStatus = status;
    this._deferredArgs = args;

    if (status === 'succeeded')
      callbacks = this._callbacks;
    else if (status === 'failed')
      callbacks = this._errbacks;

    if (!callbacks) return;

    var callback;
    while (callback = callbacks.shift())
      callback[0].apply(callback[1], this._deferredArgs);
  }
};


Faye.Publisher = {
  countListeners: function(eventType) {
    if (!this._subscribers || !this._subscribers[eventType]) return 0;
    return this._subscribers[eventType].length;
  },

  bind: function(eventType, listener, context) {
    this._subscribers = this._subscribers || {};
    var list = this._subscribers[eventType] = this._subscribers[eventType] || [];
    list.push([listener, context]);
  },

  unbind: function(eventType, listener, context) {
    if (!this._subscribers || !this._subscribers[eventType]) return;

    if (!listener) {
      delete this._subscribers[eventType];
      return;
    }
    var list = this._subscribers[eventType],
        i    = list.length;

    while (i--) {
      if (listener !== list[i][0]) continue;
      if (context && list[i][1] !== context) continue;
      list.splice(i,1);
    }
  },

  trigger: function() {
    var args = Array.prototype.slice.call(arguments),
        eventType = args.shift();

    if (!this._subscribers || !this._subscribers[eventType]) return;

    var listeners = this._subscribers[eventType].slice(),
        listener;

    for (var i = 0, n = listeners.length; i < n; i++) {
      listener = listeners[i];
      listener[0].apply(listener[1], args);
    }
  }
};


Faye.Timeouts = {
  addTimeout: function(name, delay, callback, context) {
    this._timeouts = this._timeouts || {};
    if (this._timeouts.hasOwnProperty(name)) return;
    var self = this;
    this._timeouts[name] = Faye.ENV.setTimeout(function() {
      delete self._timeouts[name];
      callback.call(context);
    }, 1000 * delay);
  },

  removeTimeout: function(name) {
    this._timeouts = this._timeouts || {};
    var timeout = this._timeouts[name];
    if (!timeout) return;
    clearTimeout(timeout);
    delete this._timeouts[name];
  }
};


Faye.Logging = {
  LOG_LEVELS: {
    error:  3,
    warn:   2,
    info:   1,
    debug:  0
  },

  logLevel: 'error',

  log: function(messageArgs, level) {
    if (!Faye.logger) return;

    var levels = Faye.Logging.LOG_LEVELS;
    if (levels[Faye.Logging.logLevel] > levels[level]) return;

    var messageArgs = Array.prototype.slice.apply(messageArgs),
        banner = ' [' + level.toUpperCase() + '] [Faye',
        klass  = this.className,

        message = messageArgs.shift().replace(/\?/g, function() {
          try {
            return Faye.toJSON(messageArgs.shift());
          } catch (e) {
            return '[Object]';
          }
        });

    for (var key in Faye) {
      if (klass) continue;
      if (typeof Faye[key] !== 'function') continue;
      if (this instanceof Faye[key]) klass = key;
    }
    if (klass) banner += '.' + klass;
    banner += '] ';

    Faye.logger(Faye.timestamp() + banner + message);
  }
};

(function() {
  for (var key in Faye.Logging.LOG_LEVELS)
    (function(level, value) {
      Faye.Logging[level] = function() {
        this.log(arguments, level);
      };
    })(key, Faye.Logging.LOG_LEVELS[key]);
})();


Faye.Grammar = {
  LOWALPHA:     /^[a-z]$/,
  UPALPHA:     /^[A-Z]$/,
  ALPHA:     /^([a-z]|[A-Z])$/,
  DIGIT:     /^[0-9]$/,
  ALPHANUM:     /^(([a-z]|[A-Z])|[0-9])$/,
  MARK:     /^(\-|\_|\!|\~|\(|\)|\$|\@)$/,
  STRING:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*$/,
  TOKEN:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+$/,
  INTEGER:     /^([0-9])+$/,
  CHANNEL_SEGMENT:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+$/,
  CHANNEL_SEGMENTS:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*$/,
  CHANNEL_NAME:     /^\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*$/,
  WILD_CARD:     /^\*{1,2}$/,
  CHANNEL_PATTERN:     /^(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*\/\*{1,2}$/,
  VERSION_ELEMENT:     /^(([a-z]|[A-Z])|[0-9])(((([a-z]|[A-Z])|[0-9])|\-|\_))*$/,
  VERSION:     /^([0-9])+(\.(([a-z]|[A-Z])|[0-9])(((([a-z]|[A-Z])|[0-9])|\-|\_))*)*$/,
  CLIENT_ID:     /^((([a-z]|[A-Z])|[0-9]))+$/,
  ID:     /^((([a-z]|[A-Z])|[0-9]))+$/,
  ERROR_MESSAGE:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*$/,
  ERROR_ARGS:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*(,(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)*$/,
  ERROR_CODE:     /^[0-9][0-9][0-9]$/,
  ERROR:     /^([0-9][0-9][0-9]:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*(,(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)*:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*|[0-9][0-9][0-9]::(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)$/
};


Faye.Extensible = {
  addExtension: function(extension) {
    this._extensions = this._extensions || [];
    this._extensions.push(extension);
    if (extension.added) extension.added(this);
  },

  removeExtension: function(extension) {
    if (!this._extensions) return;
    var i = this._extensions.length;
    while (i--) {
      if (this._extensions[i] !== extension) continue;
      this._extensions.splice(i,1);
      if (extension.removed) extension.removed(this);
    }
  },

  pipeThroughExtensions: function(stage, message, callback, context) {
    this.debug('Passing through ? extensions: ?', stage, message);

    if (!this._extensions) return callback.call(context, message);
    var extensions = this._extensions.slice();

    var pipe = function(message) {
      if (!message) return callback.call(context, message);

      var extension = extensions.shift();
      if (!extension) return callback.call(context, message);

      if (extension[stage]) extension[stage](message, pipe);
      else pipe(message);
    };
    pipe(message);
  }
};

Faye.extend(Faye.Extensible, Faye.Logging);

Faye.Channel = Faye.Class({
  initialize: function(name) {
    this.id = this.name = name;
  },

  push: function(message) {
    this.trigger('message', message);
  },

  isUnused: function() {
    return this.countListeners('message') === 0;
  }
});

Faye.extend(Faye.Channel.prototype, Faye.Publisher);

Faye.extend(Faye.Channel, {
  HANDSHAKE:    '/meta/handshake',
  CONNECT:      '/meta/connect',
  SUBSCRIBE:    '/meta/subscribe',
  UNSUBSCRIBE:  '/meta/unsubscribe',
  DISCONNECT:   '/meta/disconnect',

  META:         'meta',
  SERVICE:      'service',

  expand: function(name) {
    var segments = this.parse(name),
        channels = ['/**', name];

    var copy = segments.slice();
    copy[copy.length - 1] = '*';
    channels.push(this.unparse(copy));

    for (var i = 1, n = segments.length; i < n; i++) {
      copy = segments.slice(0, i);
      copy.push('**');
      channels.push(this.unparse(copy));
    }

    return channels;
  },

  isValid: function(name) {
    return Faye.Grammar.CHANNEL_NAME.test(name) ||
           Faye.Grammar.CHANNEL_PATTERN.test(name);
  },

  parse: function(name) {
    if (!this.isValid(name)) return null;
    return name.split('/').slice(1);
  },

  unparse: function(segments) {
    return '/' + segments.join('/');
  },

  isMeta: function(name) {
    var segments = this.parse(name);
    return segments ? (segments[0] === this.META) : null;
  },

  isService: function(name) {
    var segments = this.parse(name);
    return segments ? (segments[0] === this.SERVICE) : null;
  },

  isSubscribable: function(name) {
    if (!this.isValid(name)) return null;
    return !this.isMeta(name) && !this.isService(name);
  },

  Set: Faye.Class({
    initialize: function() {
      this._channels = {};
    },

    getKeys: function() {
      var keys = [];
      for (var key in this._channels) keys.push(key);
      return keys;
    },

    remove: function(name) {
      delete this._channels[name];
    },

    hasSubscription: function(name) {
      return this._channels.hasOwnProperty(name);
    },

    subscribe: function(names, callback, context) {
      if (!callback) return;
      var name;
      for (var i = 0, n = names.length; i < n; i++) {
        name = names[i];
        var channel = this._channels[name] = this._channels[name] || new Faye.Channel(name);
        channel.bind('message', callback, context);
      }
    },

    unsubscribe: function(name, callback, context) {
      var channel = this._channels[name];
      if (!channel) return false;
      channel.unbind('message', callback, context);

      if (channel.isUnused()) {
        this.remove(name);
        return true;
      } else {
        return false;
      }
    },

    distributeMessage: function(message) {
      var channels = Faye.Channel.expand(message.channel);

      for (var i = 0, n = channels.length; i < n; i++) {
        var channel = this._channels[channels[i]];
        if (channel) channel.trigger('message', message.data);
      }
    }
  })
});


Faye.Publication = Faye.Class(Faye.Deferrable);


Faye.Subscription = Faye.Class({
  initialize: function(client, channels, callback, context) {
    this._client    = client;
    this._channels  = channels;
    this._callback  = callback;
    this._context     = context;
    this._cancelled = false;
  },

  cancel: function() {
    if (this._cancelled) return;
    this._client.unsubscribe(this._channels, this._callback, this._context);
    this._cancelled = true;
  },

  unsubscribe: function() {
    this.cancel();
  }
});

Faye.extend(Faye.Subscription.prototype, Faye.Deferrable);


Faye.Client = Faye.Class({
  UNCONNECTED:          1,
  CONNECTING:           2,
  CONNECTED:            3,
  DISCONNECTED:         4,

  HANDSHAKE:            'handshake',
  RETRY:                'retry',
  NONE:                 'none',

  CONNECTION_TIMEOUT:   60.0,
  DEFAULT_RETRY:        5.0,

  DEFAULT_ENDPOINT:     '/bayeux',
  INTERVAL:             0.0,

  initialize: function(endpoint, options) {
    this.info('New client created for ?', endpoint);

    this._options   = options || {};
    this.endpoint   = endpoint || this.DEFAULT_ENDPOINT;
    this.endpoints  = this._options.endpoints || {};
    this.transports = {};
    this._cookies   = Faye.CookieJar && new Faye.CookieJar();
    this._headers   = {};
    this._disabled  = [];
    this.retry      = this._options.retry || this.DEFAULT_RETRY;

    this._state     = this.UNCONNECTED;
    this._channels  = new Faye.Channel.Set();
    this._messageId = 0;

    this._responseCallbacks = {};

    this._advice = {
      reconnect: this.RETRY,
      interval:  1000 * (this._options.interval || this.INTERVAL),
      timeout:   1000 * (this._options.timeout  || this.CONNECTION_TIMEOUT)
    };

    if (Faye.Event)
      Faye.Event.on(Faye.ENV, 'beforeunload', function() {
        if (Faye.indexOf(this._disabled, 'autodisconnect') < 0)
          this.disconnect();
      }, this);
  },

  disable: function(feature) {
    this._disabled.push(feature);
  },

  setHeader: function(name, value) {
    this._headers[name] = value;
  },

  getClientId: function() {
    return this._clientId;
  },

  getState: function() {
    switch (this._state) {
      case this.UNCONNECTED:  return 'UNCONNECTED';
      case this.CONNECTING:   return 'CONNECTING';
      case this.CONNECTED:    return 'CONNECTED';
      case this.DISCONNECTED: return 'DISCONNECTED';
    }
  },

  // Request
  // MUST include:  * channel
  //                * version
  //                * supportedConnectionTypes
  // MAY include:   * minimumVersion
  //                * ext
  //                * id
  //
  // Success Response                             Failed Response
  // MUST include:  * channel                     MUST include:  * channel
  //                * version                                    * successful
  //                * supportedConnectionTypes                   * error
  //                * clientId                    MAY include:   * supportedConnectionTypes
  //                * successful                                 * advice
  // MAY include:   * minimumVersion                             * version
  //                * advice                                     * minimumVersion
  //                * ext                                        * ext
  //                * id                                         * id
  //                * authSuccessful
  handshake: function(callback, context) {
    if (this._advice.reconnect === this.NONE) return;
    if (this._state !== this.UNCONNECTED) return;

    this._state = this.CONNECTING;
    var self = this;

    this.info('Initiating handshake with ?', this.endpoint);
    this._selectTransport(Faye.MANDATORY_CONNECTION_TYPES);

    this._send({
      channel:      Faye.Channel.HANDSHAKE,
      version:      Faye.BAYEUX_VERSION,
      supportedConnectionTypes: [this._transport.connectionType]

    }, function(response) {

      if (response.successful) {
        this._state     = this.CONNECTED;
        this._clientId  = response.clientId;

        this._selectTransport(response.supportedConnectionTypes);

        this.info('Handshake successful: ?', this._clientId);

        this.subscribe(this._channels.getKeys(), true);
        if (callback) callback.call(context);

      } else {
        this.info('Handshake unsuccessful');
        Faye.ENV.setTimeout(function() { self.handshake(callback, context) }, this._advice.interval);
        this._state = this.UNCONNECTED;
      }
    }, this);
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  //                * connectionType                     * clientId
  // MAY include:   * ext                 MAY include:   * error
  //                * id                                 * advice
  //                                                     * ext
  //                                                     * id
  //                                                     * timestamp
  connect: function(callback, context) {
    if (this._advice.reconnect === this.NONE) return;
    if (this._state === this.DISCONNECTED) return;

    if (this._state === this.UNCONNECTED)
      return this.handshake(function() { this.connect(callback, context) }, this);

    this.callback(callback, context);
    if (this._state !== this.CONNECTED) return;

    this.info('Calling deferred actions for ?', this._clientId);
    this.setDeferredStatus('succeeded');
    this.setDeferredStatus('deferred');

    if (this._connectRequest) return;
    this._connectRequest = true;

    this.info('Initiating connection for ?', this._clientId);

    this._send({
      channel:        Faye.Channel.CONNECT,
      clientId:       this._clientId,
      connectionType: this._transport.connectionType

    }, this._cycleConnection, this);
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  // MAY include:   * ext                                * clientId
  //                * id                  MAY include:   * error
  //                                                     * ext
  //                                                     * id
  disconnect: function() {
    if (this._state !== this.CONNECTED) return;
    this._state = this.DISCONNECTED;

    this.info('Disconnecting ?', this._clientId);

    this._send({
      channel:    Faye.Channel.DISCONNECT,
      clientId:   this._clientId

    }, function(response) {
      if (response.successful) this._transport.close();
    }, this);

    this.info('Clearing channel listeners for ?', this._clientId);
    this._channels = new Faye.Channel.Set();
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  //                * subscription                       * clientId
  // MAY include:   * ext                                * subscription
  //                * id                  MAY include:   * error
  //                                                     * advice
  //                                                     * ext
  //                                                     * id
  //                                                     * timestamp
  subscribe: function(channel, callback, context) {
    if (channel instanceof Array)
      return Faye.map(channel, function(c) {
        return this.subscribe(c, callback, context);
      }, this);

    var subscription = new Faye.Subscription(this, channel, callback, context),
        force        = (callback === true),
        hasSubscribe = this._channels.hasSubscription(channel);

    if (hasSubscribe && !force) {
      this._channels.subscribe([channel], callback, context);
      subscription.setDeferredStatus('succeeded');
      return subscription;
    }

    this.connect(function() {
      this.info('Client ? attempting to subscribe to ?', this._clientId, channel);
      if (!force) this._channels.subscribe([channel], callback, context);

      this._send({
        channel:      Faye.Channel.SUBSCRIBE,
        clientId:     this._clientId,
        subscription: channel

      }, function(response) {
        if (!response.successful) {
          subscription.setDeferredStatus('failed', Faye.Error.parse(response.error));
          return this._channels.unsubscribe(channel, callback, context);
        }

        var channels = [].concat(response.subscription);
        this.info('Subscription acknowledged for ? to ?', this._clientId, channels);
        subscription.setDeferredStatus('succeeded');
      }, this);
    }, this);

    return subscription;
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  //                * subscription                       * clientId
  // MAY include:   * ext                                * subscription
  //                * id                  MAY include:   * error
  //                                                     * advice
  //                                                     * ext
  //                                                     * id
  //                                                     * timestamp
  unsubscribe: function(channel, callback, context) {
    if (channel instanceof Array)
      return Faye.map(channel, function(c) {
        return this.unsubscribe(c, callback, context);
      }, this);

    var dead = this._channels.unsubscribe(channel, callback, context);
    if (!dead) return;

    this.connect(function() {
      this.info('Client ? attempting to unsubscribe from ?', this._clientId, channel);

      this._send({
        channel:      Faye.Channel.UNSUBSCRIBE,
        clientId:     this._clientId,
        subscription: channel

      }, function(response) {
        if (!response.successful) return;

        var channels = [].concat(response.subscription);
        this.info('Unsubscription acknowledged for ? from ?', this._clientId, channels);
      }, this);
    }, this);
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * data                               * successful
  // MAY include:   * clientId            MAY include:   * id
  //                * id                                 * error
  //                * ext                                * ext
  publish: function(channel, data) {
    var publication = new Faye.Publication();

    this.connect(function() {
      this.info('Client ? queueing published message to ?: ?', this._clientId, channel, data);

      this._send({
        channel:      channel,
        data:         data,
        clientId:     this._clientId
      }, function(response) {
        if (response.successful)
          publication.setDeferredStatus('succeeded');
        else
          publication.setDeferredStatus('failed', Faye.Error.parse(response.error));
      }, this);
    }, this);

    return publication;
  },

  receiveMessage: function(message) {
    this.pipeThroughExtensions('incoming', message, function(message) {
      if (!message) return;

      if (message.advice) this._handleAdvice(message.advice);
      this._deliverMessage(message);

      if (message.successful === undefined) return;

      var callback = this._responseCallbacks[message.id];
      if (!callback) return;

      delete this._responseCallbacks[message.id];
      callback[0].call(callback[1], message);
    }, this);
  },

  _selectTransport: function(transportTypes) {
    Faye.Transport.get(this, transportTypes, this._disabled, function(transport) {
      this.debug('Selected ? transport for ?', transport.connectionType, transport.endpoint);

      if (transport === this._transport) return;
      if (this._transport) this._transport.close();

      this._transport = transport;
      this._transport.cookies = this._cookies;
      this._transport.headers = this._headers;

      transport.bind('down', function() {
        if (this._transportUp !== undefined && !this._transportUp) return;
        this._transportUp = false;
        this.trigger('transport:down');
      }, this);

      transport.bind('up', function() {
        if (this._transportUp !== undefined && this._transportUp) return;
        this._transportUp = true;
        this.trigger('transport:up');
      }, this);
    }, this);
  },

  _send: function(message, callback, context) {
    message.id = this._generateMessageId();
    if (callback) this._responseCallbacks[message.id] = [callback, context];

    this.pipeThroughExtensions('outgoing', message, function(message) {
      if (!message) return;
      this._transport.send(message, this._advice.timeout / 1000);
    }, this);
  },

  _generateMessageId: function() {
    this._messageId += 1;
    if (this._messageId >= Math.pow(2,32)) this._messageId = 0;
    return this._messageId.toString(36);
  },

  _handleAdvice: function(advice) {
    Faye.extend(this._advice, advice);

    if (this._advice.reconnect === this.HANDSHAKE && this._state !== this.DISCONNECTED) {
      this._state    = this.UNCONNECTED;
      this._clientId = null;
      this._cycleConnection();
    }
  },

  _deliverMessage: function(message) {
    if (!message.channel || message.data === undefined) return;
    this.info('Client ? calling listeners for ? with ?', this._clientId, message.channel, message.data);
    this._channels.distributeMessage(message);
  },

  _teardownConnection: function() {
    if (!this._connectRequest) return;
    this._connectRequest = null;
    this.info('Closed connection for ?', this._clientId);
  },

  _cycleConnection: function() {
    this._teardownConnection();
    var self = this;
    Faye.ENV.setTimeout(function() { self.connect() }, this._advice.interval);
  }
});

Faye.extend(Faye.Client.prototype, Faye.Deferrable);
Faye.extend(Faye.Client.prototype, Faye.Publisher);
Faye.extend(Faye.Client.prototype, Faye.Logging);
Faye.extend(Faye.Client.prototype, Faye.Extensible);


Faye.Transport = Faye.extend(Faye.Class({
  MAX_DELAY: 0.0,
  batching:  true,

  initialize: function(client, endpoint) {
    this._client  = client;
    this.endpoint = endpoint;
    this._outbox  = [];
  },

  close: function() {},

  send: function(message, timeout) {
    this.debug('Client ? sending message to ?: ?',
               this._client._clientId, this.endpoint, message);

    if (!this.batching) return this.request([message], timeout);

    this._outbox.push(message);
    this._timeout = timeout;

    if (message.channel === Faye.Channel.HANDSHAKE)
      return this.addTimeout('publish', 0.01, this.flush, this);

    if (message.channel === Faye.Channel.CONNECT)
      this._connectMessage = message;

    if (this.shouldFlush && this.shouldFlush(this._outbox))
      return this.flush();

    this.addTimeout('publish', this.MAX_DELAY, this.flush, this);
  },

  flush: function() {
    this.removeTimeout('publish');

    if (this._outbox.length > 1 && this._connectMessage)
      this._connectMessage.advice = {timeout: 0};

    this.request(this._outbox, this._timeout);

    this._connectMessage = null;
    this._outbox = [];
  },

  receive: function(responses) {
    this.debug('Client ? received from ?: ?',
               this._client._clientId, this.endpoint, responses);

    for (var i = 0, n = responses.length; i < n; i++) {
      this._client.receiveMessage(responses[i]);
    }
  },

  retry: function(message, timeout) {
    var called = false,
        retry  = this._client.retry * 1000,
        self   = this;

    return function() {
      if (called) return;
      called = true;
      Faye.ENV.setTimeout(function() { self.request(message, timeout) }, retry);
    };
  }

}), {
  MAX_URL_LENGTH: 2048,

  get: function(client, allowed, disabled, callback, context) {
    var endpoint = client.endpoint;

    Faye.asyncEach(this._transports, function(pair, resume) {
      var connType     = pair[0], klass = pair[1],
          connEndpoint = client.endpoints[connType] || endpoint;

      if (Faye.indexOf(disabled, connType) >= 0)
        return resume();

      if (Faye.indexOf(allowed, connType) < 0) {
        klass.isUsable(client, connEndpoint, function() {});
        return resume();
      }

      klass.isUsable(client, connEndpoint, function(isUsable) {
        if (!isUsable) return resume();
        var transport = klass.hasOwnProperty('create') ? klass.create(client, connEndpoint) : new klass(client, connEndpoint);
        callback.call(context, transport);
      });
    }, function() {
      throw new Error('Could not find a usable connection type for ' + endpoint);
    });
  },

  register: function(type, klass) {
    this._transports.push([type, klass]);
    klass.prototype.connectionType = type;
  },

  _transports: []
});

Faye.extend(Faye.Transport.prototype, Faye.Logging);
Faye.extend(Faye.Transport.prototype, Faye.Publisher);
Faye.extend(Faye.Transport.prototype, Faye.Timeouts);


Faye.Event = {
  _registry: [],

  on: function(element, eventName, callback, context) {
    var wrapped = function() { callback.call(context) };

    if (element.addEventListener)
      element.addEventListener(eventName, wrapped, false);
    else
      element.attachEvent('on' + eventName, wrapped);

    this._registry.push({
      _element:   element,
      _type:      eventName,
      _callback:  callback,
      _context:     context,
      _handler:   wrapped
    });
  },

  detach: function(element, eventName, callback, context) {
    var i = this._registry.length, register;
    while (i--) {
      register = this._registry[i];

      if ((element    && element    !== register._element)   ||
          (eventName  && eventName  !== register._type)      ||
          (callback   && callback   !== register._callback)  ||
          (context      && context      !== register._context))
        continue;

      if (register._element.removeEventListener)
        register._element.removeEventListener(register._type, register._handler, false);
      else
        register._element.detachEvent('on' + register._type, register._handler);

      this._registry.splice(i,1);
      register = null;
    }
  }
};

Faye.Event.on(Faye.ENV, 'unload', Faye.Event.detach, Faye.Event);


Faye.URI = Faye.extend(Faye.Class({
  queryString: function() {
    var pairs = [];
    for (var key in this.params) {
      if (!this.params.hasOwnProperty(key)) continue;
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(this.params[key]));
    }
    return pairs.join('&');
  },

  isSameOrigin: function() {
    var host = Faye.URI.parse(Faye.ENV.location.href, false);

    var external = (host.hostname !== this.hostname) ||
                   (host.port !== this.port) ||
                   (host.protocol !== this.protocol);

    return !external;
  },

  toURL: function() {
    var query = this.queryString();
    return this.protocol + '//' + this.hostname + (this.port ? ':' + this.port : '') +
           this.pathname + (query ? '?' + query : '') + this.hash;
  }
}), {
  parse: function(url, params) {
    if (typeof url !== 'string') return url;
    var uri = new this(), parts;

    var consume = function(name, pattern, infer) {
      url = url.replace(pattern, function(match) {
        uri[name] = match;
        return '';
      });
      if (uri[name] === undefined)
        uri[name] = infer ? Faye.ENV.location[name] : '';
    };

    consume('protocol', /^https?\:/,    true);
    consume('host',     /^\/\/[^\/]+/,  true);

    if (!/^\//.test(url)) url = Faye.ENV.location.pathname.replace(/[^\/]*$/, '') + url;
    consume('pathname', /^\/[^\?#]*/);
    consume('search',   /^\?[^#]*/);
    consume('hash',     /^#.*/);

    if (/^\/\//.test(uri.host)) {
      uri.host = uri.host.substr(2);
      parts = uri.host.split(':');
      uri.hostname = parts[0];
      uri.port = parts[1] || '';
    } else {
      uri.hostname = Faye.ENV.location.hostname;
      uri.port = Faye.ENV.location.port;
    }

    if (params === false) {
      uri.params = {};
    } else {
      var query = uri.search.replace(/^\?/, ''),
          pairs = query ? query.split('&') : [],
          n     = pairs.length,
          data  = {};

      while (n--) {
        parts = pairs[n].split('=');
        data[decodeURIComponent(parts[0] || '')] = decodeURIComponent(parts[1] || '');
      }
      if (typeof params === 'object') Faye.extend(data, params);

      uri.params = data;
    }

    return uri;
  }
});


/*
    http://www.JSON.org/json2.js
    2009-04-16

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html

    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the object holding the key.

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/*jslint evil: true */

/*global JSON */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
    JSON = {};
}
(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z';
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

// NOTE we've hacked this to expose this method to Faye. We need to use this
// to avoid problems with buggy Firefox version and bad #toJSON implementations

        Faye.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = Faye.stringify;
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());


Faye.Transport.WebSocket = Faye.extend(Faye.Class(Faye.Transport, {
  UNCONNECTED:  1,
  CONNECTING:   2,
  CONNECTED:    3,

  batching:     false,

  isUsable: function(callback, context) {
    this.callback(function() { callback.call(context, true) });
    this.errback(function() { callback.call(context, false) });
    this.connect();
  },

  request: function(messages, timeout) {
    if (messages.length === 0) return;
    this._messages = this._messages || {};

    for (var i = 0, n = messages.length; i < n; i++) {
      this._messages[messages[i].id] = messages[i];
    }
    this.callback(function(socket) { socket.send(Faye.toJSON(messages)) });
    this.connect();
  },

  close: function() {
    if (!this._socket) return;
    this._socket.onclose = this._socket.onerror = null;
    this._socket.close();
    delete this._socket;
    this.setDeferredStatus('deferred');
    this._state = this.UNCONNECTED;
  },

  connect: function() {
    if (Faye.Transport.WebSocket._unloaded) return;

    this._state = this._state || this.UNCONNECTED;
    if (this._state !== this.UNCONNECTED) return;

    this._state = this.CONNECTING;

    var ws = Faye.Transport.WebSocket.getClass();
    if (!ws) return this.setDeferredStatus('failed');

    this._socket = new ws(Faye.Transport.WebSocket.getSocketUrl(this.endpoint));
    var self = this;

    this._socket.onopen = function() {
      self._state = self.CONNECTED;
      self._everConnected = true;
      self.setDeferredStatus('succeeded', self._socket);
      self.trigger('up');
    };

    this._socket.onmessage = function(event) {
      var messages = JSON.parse(event.data);
      if (!messages) return;
      messages = [].concat(messages);

      for (var i = 0, n = messages.length; i < n; i++) {
        delete self._messages[messages[i].id];
      }
      self.receive(messages);
    };

    this._socket.onclose = this._socket.onerror = function() {
      var wasConnected = (self._state === self.CONNECTED);
      self.setDeferredStatus('deferred');
      self._state = self.UNCONNECTED;

      self.close();

      if (wasConnected) return self.resend();
      if (!self._everConnected) return self.setDeferredStatus('failed');

      var retry = self._client.retry * 1000;
      Faye.ENV.setTimeout(function() { self.connect() }, retry);
      self.trigger('down');
    };
  },

  resend: function() {
    if (!this._messages) return;
    var messages = Faye.map(this._messages, function(id, msg) { return msg });
    this.request(messages);
  }
}), {
  getSocketUrl: function(endpoint) {
    if (Faye.URI) endpoint = Faye.URI.parse(endpoint).toURL();
    return endpoint.replace(/^http(s?):/ig, 'ws$1:');
  },

  getClass: function() {
    return (Faye.WebSocket && Faye.WebSocket.Client) ||
            Faye.ENV.WebSocket ||
            Faye.ENV.MozWebSocket;
  },

  isUsable: function(client, endpoint, callback, context) {
    this.create(client, endpoint).isUsable(callback, context);
  },

  create: function(client, endpoint) {
    var sockets = client.transports.websocket = client.transports.websocket || {};
    sockets[endpoint] = sockets[endpoint] || new this(client, endpoint);
    return sockets[endpoint];
  }
});

Faye.extend(Faye.Transport.WebSocket.prototype, Faye.Deferrable);
Faye.Transport.register('websocket', Faye.Transport.WebSocket);

if (Faye.Event)
  Faye.Event.on(Faye.ENV, 'beforeunload', function() {
    Faye.Transport.WebSocket._unloaded = true;
  });


Faye.Transport.EventSource = Faye.extend(Faye.Class(Faye.Transport, {
  initialize: function(client, endpoint) {
    Faye.Transport.prototype.initialize.call(this, client, endpoint);
    if (!Faye.ENV.EventSource) return this.setDeferredStatus('failed');

    this._xhr = new Faye.Transport.XHR(client, endpoint);

    var socket = new EventSource(endpoint + '/' + client.getClientId()),
        self   = this;

    socket.onopen = function() {
      self._everConnected = true;
      self.setDeferredStatus('succeeded');
      self.trigger('up');
    };

    socket.onerror = function() {
      if (self._everConnected) {
        self.trigger('down');
      } else {
        self.setDeferredStatus('failed');
        socket.close();
      }
    };

    socket.onmessage = function(event) {
      self.receive(JSON.parse(event.data));
      self.trigger('up');
    };

    this._socket = socket;
  },

  isUsable: function(callback, context) {
    this.callback(function() { callback.call(context, true) });
    this.errback(function() { callback.call(context, false) });
  },

  request: function(message, timeout) {
    this._xhr.request(message, timeout);
  },

  close: function() {
    if (!this._socket) return;
    this._socket.onerror = null;
    this._socket.close();
    delete this._socket;
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    var id = client.getClientId();
    if (!id) return callback.call(context, false);

    Faye.Transport.XHR.isUsable(client, endpoint, function(usable) {
      if (!usable) return callback.call(context, false);
      this.create(client, endpoint).isUsable(callback, context);
    }, this);
  },

  create: function(client, endpoint) {
    var sockets  = client.transports.eventsource = client.transports.eventsource || {},
        id       = client.getClientId(),
        endpoint = endpoint + '/' + (id || '');

    sockets[endpoint] = sockets[endpoint] || new this(client, endpoint);
    return sockets[endpoint];
  }
});

Faye.extend(Faye.Transport.EventSource.prototype, Faye.Deferrable);
Faye.Transport.register('eventsource', Faye.Transport.EventSource);


Faye.Transport.XHR = Faye.extend(Faye.Class(Faye.Transport, {
  request: function(message, timeout) {
    var retry = this.retry(message, timeout),
        path  = Faye.URI.parse(this.endpoint).pathname,
        self  = this,
        xhr   = Faye.ENV.ActiveXObject
              ? new ActiveXObject("Microsoft.XMLHTTP")
              : new XMLHttpRequest();

    xhr.open('POST', path, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    var headers = this.headers;
    for (var key in headers) {
      if (!headers.hasOwnProperty(key)) continue;
      xhr.setRequestHeader(key, headers[key]);
    }

    var abort = function() { xhr.abort() };
    Faye.Event.on(Faye.ENV, 'beforeunload', abort);

    var cleanUp = function() {
      Faye.Event.detach(Faye.ENV, 'beforeunload', abort);
      xhr.onreadystatechange = function() {};
      xhr = null;
    };

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;

      var parsedMessage = null,
          status        = xhr.status,
          successful    = ((status >= 200 && status < 300) ||
                            status === 304 ||
                            status === 1223);

      if (!successful) {
        cleanUp();
        retry();
        return self.trigger('down');
      }

      try {
        parsedMessage = JSON.parse(xhr.responseText);
      } catch (e) {}

      cleanUp();

      if (parsedMessage) {
        self.receive(parsedMessage);
        self.trigger('up');
      } else {
        retry();
        self.trigger('down');
      }
    };

    xhr.send(Faye.toJSON(message));
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    callback.call(context, Faye.URI.parse(endpoint).isSameOrigin());
  }
});

Faye.Transport.register('long-polling', Faye.Transport.XHR);

Faye.Transport.CORS = Faye.extend(Faye.Class(Faye.Transport, {
  request: function(message, timeout) {
    var xhrClass = Faye.ENV.XDomainRequest ? XDomainRequest : XMLHttpRequest,
        xhr      = new xhrClass(),
        retry    = this.retry(message, timeout),
        self     = this;

    xhr.open('POST', this.endpoint, true);
    if (xhr.setRequestHeader) xhr.setRequestHeader('Pragma', 'no-cache');

    var cleanUp = function() {
      if (!xhr) return false;
      xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = null;
      xhr = null;
      Faye.ENV.clearTimeout(timer);
      return true;
    };

    xhr.onload = function() {
      var parsedMessage = null;
      try {
        parsedMessage = JSON.parse(xhr.responseText);
      } catch (e) {}

      cleanUp();

      if (parsedMessage) {
        self.receive(parsedMessage);
        self.trigger('up');
      } else {
        retry();
        self.trigger('down');
      }
    };

    var onerror = function() {
      cleanUp();
      retry();
      self.trigger('down');
    };
    var timer = Faye.ENV.setTimeout(onerror, 1.5 * 1000 * timeout);
    xhr.onerror = onerror;
    xhr.ontimeout = onerror;

    xhr.onprogress = function() {};
    xhr.send('message=' + encodeURIComponent(Faye.toJSON(message)));
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    if (Faye.URI.parse(endpoint).isSameOrigin())
      return callback.call(context, false);

    if (Faye.ENV.XDomainRequest)
      return callback.call(context, Faye.URI.parse(endpoint).protocol ===
                                    Faye.URI.parse(Faye.ENV.location).protocol);

    if (Faye.ENV.XMLHttpRequest) {
      var xhr = new Faye.ENV.XMLHttpRequest();
      return callback.call(context, xhr.withCredentials !== undefined);
    }
    return callback.call(context, false);
  }
});

Faye.Transport.register('cross-origin-long-polling', Faye.Transport.CORS);


Faye.Transport.JSONP = Faye.extend(Faye.Class(Faye.Transport, {
  shouldFlush: function(messages) {
    var params = {
      message:  Faye.toJSON(messages),
      jsonp:    '__jsonp' + Faye.Transport.JSONP._cbCount + '__'
    };
    var location = Faye.URI.parse(this.endpoint, params).toURL();
    return location.length >= Faye.Transport.MAX_URL_LENGTH;
  },

  request: function(messages, timeout) {
    var params       = {message: Faye.toJSON(messages)},
        head         = document.getElementsByTagName('head')[0],
        script       = document.createElement('script'),
        callbackName = Faye.Transport.JSONP.getCallbackName(),
        location     = Faye.URI.parse(this.endpoint, params),
        retry        = this.retry(messages, timeout),
        self         = this;

    Faye.ENV[callbackName] = function(data) {
      cleanUp();
      self.receive(data);
      self.trigger('up');
    };

    var timer = Faye.ENV.setTimeout(function() {
      cleanUp();
      retry();
      self.trigger('down');
    }, 1.5 * 1000 * timeout);

    var cleanUp = function() {
      if (!Faye.ENV[callbackName]) return false;
      Faye.ENV[callbackName] = undefined;
      try { delete Faye.ENV[callbackName] } catch (e) {}
      Faye.ENV.clearTimeout(timer);
      script.parentNode.removeChild(script);
      return true;
    };

    location.params.jsonp = callbackName;
    script.type = 'text/javascript';
    script.src  = location.toURL();
    head.appendChild(script);
  }
}), {
  _cbCount: 0,

  getCallbackName: function() {
    this._cbCount += 1;
    return '__jsonp' + this._cbCount + '__';
  },

  isUsable: function(client, endpoint, callback, context) {
    callback.call(context, true);
  }
});

Faye.Transport.register('callback-polling', Faye.Transport.JSONP);
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
        profileURL = '';
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
    // it doesn't make sense to line to a user in the case of WEnotes post from WordPress
    if (source === 'wenotes_wp') {
        msg += '<b>' + userFullname + '</b>&nbsp;&nbsp;<span class="WEnoteuser">' +
          '@' + userName + '</span>';
    } else {
        msg += '<a href="' + profileURL + '" style="text-decoration: none;">' +
          '<b>' + userFullname + '</b>&nbsp;&nbsp;<span class="WEnoteuser">' +
          '@' + userName + '</a></span>';
    }
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
