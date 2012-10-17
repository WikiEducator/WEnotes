/* WEnotes widget
 * Copyright 2012 Open Education Resource Foundation
 * Available under CC-BY license.
 */
function WEnotesPost(id, tag, button, leftmargin) {
  var weAPI = '/api.php';
  leftmargin = (leftmargin === '') ? 53 : leftmargin;
  button = (button === '') ? 'Post a WEnote' : unescape(button);
      
  if (id.charAt(0) !== '#') {
    id = '#' + id;
  }
  $(id).css('margin', '0px 0px 10px ' + leftmargin +'px').append('<form><textarea rows="4" cols="40" style="width:auto; float: left; margin-right: 10px; margin-bottom: 5px;"></textarea><div style="float: left;"><input type="submit" disabled="disabled" value="' + button +  '" /><p class="WEnotesPostCounter" style="color:#999; margin-left: 7px;">140</p></div></form><br clear="all" />');
  var $counter = $(id + ' p.WEnotesPostCounter');
  var $button = $(id + ' input[type="submit"]');
  var $text = $(id + ' textarea');

  function update(t) {
    var mt = t.replace(/http:\/\/([^ ]+)/g, function (target, p1) {
      return (target.length > 19) ? 'http://xxx.xx/xxxxx' : target;
    });
    var l = mt.length;
    // 140 with shortening, or 199 raw
    var r = Math.min(140 - l, 199 - t.length);
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

  if (wgUserName === null) {
    $button.attr('disabled', 'disabled');
    $text.attr('disabled', 'disabled');
    $text.attr('rows', '2');
    $counter.html('<a class="plainlinks" href="/Special:UserLogin?returnto=' + wgPageName + '">Login to post</a>');
    return;
  }
  $button.click(function() {
    $button.attr('disabled', 'disabled');
    $.ajax({
      url: weAPI,
      data: {
        action: 'wenotes',
        format: 'json',
        notag: tag,
        notext: $text.val()
      },
      async: true,
      type: 'POST',
      dataType: 'json',
      success: function(d) {
        if ('error' in d) {
          alert('Unable to save submission:\n  ' +
            d.error.info);
        }
        $button.removeAttr('disabled');
        $text.val('');
        $counter.text(140);
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
}

