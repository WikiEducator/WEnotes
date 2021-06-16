/* WEnotes widget
 * Copyright 2012 Open Education Resource Foundation
 * Available under CC-BY license.
 */
/* global wgPageName, oeru_user_object */
/* exported WEnotesPostWP */
function WEnotesPostWP(id, tag, button, leftmargin, language) {
  console.log('in WEnotesPostWP - language = '+language);
  var weAPI = '/api.php',
      postLength = 300,
      rawPostLength = postLength + 20;
  leftmargin = (leftmargin === '') ? 53 : leftmargin;
  default_button_text = 'Post a WEnote';
  language = (language === '') ? 'en_EN' : language;
  if (language == 'fr_FR' && (button === '' || button === default_button_text)) {
    console.log('setting button language!');
    button = 'Soumettre un WEnote';
  }
  button = (button === '') ? default_button_text : unescape(button);


  if (id.charAt(0) !== '#') {
    id = '#' + id;
  }
  $(id).css('margin', '0px 0px 10px ' + leftmargin +'px').append('<form><textarea rows="4" cols="40" style="width:auto; height: 1.5em; float: left; margin-right: 10px; margin-bottom: 5px;"></textarea><div style="float: left;"><input type="submit" style="margin-top: 0;" disabled="disabled" value="' + button +  '" /><p class="WEnotesPostCounter" style="color:#999; margin-left: 7px; display: none;">' + postLength + '</p></div></form><br clear="all" />');
  var $counter = $(id + ' p.WEnotesPostCounter');
  var $button = $(id + ' input[type="submit"]');
  var $text = $(id + ' textarea');

  function update(t) {
    var mt = t.replace(/http:\/\/([^ ]+)/g, function (target) {
      return (target.length > 19) ? 'http://xxx.xx/xxxxx' : target;
    });
    var l = mt.length;
    var r = Math.min(postLength - l, rawPostLength - t.length);
    $counter.text(r);
    if (r >= 0) {
      $counter.css('color', '#999');
      if (l === 0) {
        $button.attr('disabled', 'disabled');
      } else {
        $button.removeAttr('disabled');
      }
    } else {
      $counter.css('color', 'red');
      $button.attr('disabled', 'disabled');
    }
  }

  function livenForm() {
    $button.click(function() {
      $button.attr('disabled', 'disabled');
      $wenote_ids = null;
      current_origin = window.location.origin.split('//')[1];
      current_schema = window.location.origin.split('//')[0].split(':')[0];
      current_path = window.location.pathname;
      if (typeof WEnotesIDs != 'undefined') {
         $wenotes_ids = WEnotesIDs;
         console.log('===== setting $wenotes_ids = ', $wenotes_ids);
         console.log('===== setting origin = ', current_origin);
      }
      $.ajax({
        url: oeru_user_object.ajaxurl,
        data: {
          action: 'wenotes',
          format: 'json',
          pathinfo: $wenotes_ids,
          origin: current_origin,
          origin_path: current_path,
          origin_schema: current_schema,
          notag: tag,
          notext: $text.val()
        },
        async: true,
        type: 'POST',
        dataType: 'json',
        success: function(d) {
          var msg = 'Unable to save submission';
          if (d === 0 || 'error' in d) {
            if (d.hasOwnProperty('error')) {
              msg = msg + ":\n" + d.error.info;
            }
            alert(msg);
          }
          $button.removeAttr('disabled');
          $text.val('');
          $counter.text(postLength);
        }
      });
      return false;
    });
    $text.bind('keyup', function() {
      update($(this).val());
    });
    $text.bind('change', function() {
      update($(this).val());
    });
    $text.focus(function() {
      $counter.fadeIn();
      $text.css('height', 'auto');
    });
  }

  function disableForm() {
    $button.attr('disabled', 'disabled');
    $text.attr('disabled', 'disabled');
    $text.attr('rows', '2');
    $counter.html('<a class="plainlinks" href="/Special:UserLogin?returnto=' + wgPageName + '">Login to post</a>');
  }

  // check if logged in to the wiki
  //   either directly where wgUserName is already set
  //   or in a snapshot, where we do an API call to find out
  if ((window.wgUserName === null) && !window.hasOwnProperty('oeru_user_object')) {
    $.ajax({
      url: weAPI,
      data: {
        action: 'query',
        meta: 'userinfo',
        format: 'json'
      },
      type: 'POST',
      dataType: 'json',
      success: function(d) {
        var userinfo;
        if (d && d.query && d.query.userinfo) {
          userinfo = d.query.userinfo;
          if (! userinfo.hasOwnProperty('anon')) {
            window.wgUserName = userinfo.name;
            livenForm();
            return;
          }
        }
        disableForm();
      }
    });
  } else {
    // in-wiki case, already know logged in state
    livenForm();
  }
}
