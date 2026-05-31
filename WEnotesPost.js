/* WEnotes post form widget
 * Copyright 2012-2016 Open Education Resource Foundation
 * Copyright 2026 Jim Tittsler and WikiEducator contributors
 * Available under CC-BY license.
 */
(function (mw, $) {
    var postLength = 300,
        rawPostLength = postLength + 20;

    function initPostForm($div) {
        var tag = $div.data("tag") || "wikieducator";
        var button = $div.data("button") || "Post a WEnote";
        var leftmargin = $div.data("leftmargin") || 53;
        var anonymous = $div.data("anonymous") || null;
        var api = new mw.Api();

        $div.css("margin", "0px 0px 10px " + leftmargin + "px").append(
            "<form>" +
                '<textarea rows="4" cols="40" style="width:auto; height: 1.5em; ' +
                'float: left; margin-right: 10px; margin-bottom: 5px;"></textarea>' +
                '<div style="float: left;">' +
                '<input type="submit" disabled="disabled" value="' +
                $("<span>").text(button).html() +
                '" />' +
                '<p class="WEnotesPostCounter" style="color:#999; margin-left: 7px; ' +
                'display: none;">' +
                postLength +
                "</p>" +
                "</div>" +
                "</form>" +
                '<br clear="all" />',
        );

        var $counter = $div.find("p.WEnotesPostCounter");
        var $button = $div.find('input[type="submit"]');
        var $text = $div.find("textarea");

        function update(t) {
            var mt = t.replace(/http:\/\/([^ ]+)/g, function (target) {
                return target.length > 19 ? "http://xxx.xx/xxxxx" : target;
            });
            var l = mt.length;
            var r = Math.min(postLength - l, rawPostLength - t.length);
            $counter.text(r);
            if (r >= 0) {
                $counter.css("color", "#999");
                $button.prop("disabled", l === 0);
            } else {
                $counter.css("color", "red");
                $button.prop("disabled", true);
            }
        }

        function notifyFeedWidgets() {
            // try to find the window.wendivs that need to be updated
            // locally, cancel poll timer and trigger immedate poll
            var lctag = tag.toLowerCase();
            $.each(window.wendivs || [], function (i, wd) {
                var wdtag = (wd.tag || "wikieducator").toLowerCase();
                // '_' is the all-tags wildcard — always notify it.
                if (wdtag === lctag || wdtag === "_") {
                    if (wd.pollTimer) {
                        clearTimeout(wd.pollTimer);
                        wd.pollTimer = null;
                    }
                    wd.$d.triggerHandler("WEnotes", [tag]);
                }
            });
        }

        function livenForm() {
            $button.click(function () {
                $button.prop("disabled", true);
                api.postWithEditToken({
                    action: "wenotes",
                    tag: tag,
                    text: $text.val(),
                })
                    .done(function (d) {
                        if ("error" in d) {
                            alert(
                                "Unable to save submission:\n  " + d.error.info,
                            );
                        } else {
                            notifyFeedWidgets();
                        }
                        $button.prop("disabled", false);
                        $text.val("");
                        $counter.text(postLength);
                    })
                    .fail(function (code) {
                        alert("Unable to save submission:\n  " + code);
                        $button.prop("disabled", false);
                    });
                return false;
            });
            $text.on("keyup change", function () {
                update($(this).val());
            });
            $text.focus(function () {
                $counter.fadeIn();
                $text.css("height", "auto");
            });
        }

        function disableForm() {
            var pageName = mw.config.get("wgPageName");
            var anonmsg =
                anonymous ||
                '<a class="plainlinks" href="/Special:UserLogin?returnto=' +
                    pageName +
                    '">Login to post</a>';
            $button.prop("disabled", true);
            $text.prop("disabled", true).attr("rows", "2");
            $counter.html(anonmsg);
        }

        // Check login state — wgUserName is set for in-wiki page renders;
        // null means we are in a snapshot/embed and must ask the API.
        if (mw.config.get("wgUserName") === null) {
            api.get({
                action: "query",
                meta: "userinfo",
            })
                .done(function (d) {
                    if (
                        d &&
                        d.query &&
                        d.query.userinfo &&
                        !d.query.userinfo.hasOwnProperty("anon")
                    ) {
                        livenForm();
                    } else {
                        disableForm();
                    }
                })
                .fail(function () {
                    disableForm();
                });
        } else {
            livenForm();
        }
    }

    // Self-initialise: find every .WEnotesPost div on the page and wire it up.
    $("div.WEnotesPost").each(function () {
        initPostForm($(this));
    });
})(mediaWiki, jQuery);

