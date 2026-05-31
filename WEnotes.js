/* global Faye */
/* WEnotes widget
 * Copyright 2012 Open Education Resource Foundation
 * Copyright 2026 Jim Tittsler and WikiEducator contributors
 * Available under CC-BY-SA license.
 */

// variables made public to simplify debugging/monitoring
window.wendivs = window.wendivs || [];
window.msg_counter = window.msg_counter || [];

(function (mw, $) {
    var protocol = window.location.protocol + "//";
    var api = new mw.Api();
    var wendivs = window.wendivs;
    var msg_counter = window.msg_counter;

    function windowConv() {
        var url = $(this).closest(".WEnote").find("time").parent().attr("href");
        window.open(url, "_twitter");
        return false;
    }

    function like() {
        var mo,
            cl,
            tag = "";
        var id = $(this).closest(".WEnote").attr("id");
        var notliked = $(this).hasClass("icon-star-empty");
        var $parent = $("#" + id).closest(".WEnotes");
        var ix = -1;
        $.each(wendivs, function (index, item) {
            if (item.$d[0] === $parent[0]) {
                ix = index;
                return false;
            }
        });
        if (ix !== -1) {
            tag = wendivs[ix].tag;
        }
        if (tag === "_") {
            cl = $("#" + id + " .WEtags").text();
            mo = /#([a-zA-Z0-9]+)/.exec(cl);
            if (mo) {
                tag = mo[1];
            }
        }
        // try to get the tag from the div
        if (mw.config.get("wgUserName") && tag) {
            api.post({
                action: "wevotes",
                vopid: "WN" + tag.toLowerCase(),
                vovid: id.slice(5),
                vovote: notliked ? 1 : 0,
                vopage: mw.config.get("wgArticleId"),
            });
            if (notliked) {
                $(this)
                    .removeClass("icon-star-empty")
                    .addClass("icon-star")
                    .attr("title", "unfavorite");
            } else {
                $(this)
                    .removeClass("icon-star")
                    .addClass("icon-star-empty")
                    .attr("title", "favorite");
            }
        } else {
            alert("You must be logged in to vote.");
        }
        return false;
    }

    function formatMessage(d, tag, novoting) {
        var msg, userName, userFullname, i, aspect, origtext, feedIcon, src;
        var sourceProfile = {
            bookmarks: "https://bookmarks.oeru.org/",
            hypothesis: "https://hypothes.is/",
            identica: "https://identi.ca/",
            mastodon: "https://mastodon.oeru.org/",
            twitter: "https://twitter.com/",
            wikieducator: protocol + "WikiEducator.org/User:",
            forums: "https://forum.oeru.org/u/",
            community: "https://forum.fossdle.org/u/",
            saylordiscourse: "https://discourse.saylor.org/u/",
            connectoeglobal: "https://connect.oeglobal.org/u/",
            milllforum: "https://forum.milll.ws/u/",
            discourse: d.we_source_url + "/u/",
        };
        var sourceTag = {
            bookmarks: "https://bookmarks.oeru.org/tags.php/",
            hypothesis: "https://hypothes.is/earch?q=tag%3A",
            identica: "https://identi.ca/tag/",
            mastodon: "https://mastodon.oeru.org/tags/",
            twitter: "https://twitter.com/#!/search?q=%23",
            wikieducator: protocol + "WikiEducator.org/",
            connectoeglobal: "https://connect.oeglobal.org/u/",
            milllforum: "https://forum.milll.ws/u/",
            discourse: d.we_source_url + "/u/",
        };
        // fix changed source tags...
        var source = d.we_source;
        if (source === "saylor-discourse") source = "saylordiscourse";
        if (source === "connect.oeglobal") source = "connectoeglobal";
        if (source === "disourse") source = "discourse";
        var user = d.user || d.from_user;

        var text = d.text;
        var timeLink = "#";
        var feedURL = false;
        var profileURL = d.profile_url || "#";
        var profileIMG =
            user.profile_image_url ||
            d.profile_image_url_https ||
            d.profile_image_url ||
            "";
        userName = user.screen_name || user.username || user;
        userFullname = user.name || d.from_user_name;

        switch (source) {
            case "bookmarks":
                timeLink =
                    "https://bookmarks.oeru.org/bookmarks.php/" +
                    user.username +
                    "/" +
                    tag;
                profileURL = user.profile_url;
                profileIMG = "/extensions/WEnotes/images/oeru_sscuttle.png";
                // d.created_at is on UTC, not NZ time... so compensate.
                d.created_at = d.we_timestamp;
                break;
            case "hypothesis":
                feedURL = user.feed_url;
                profileURL = user.profile_url;
                profileIMG = "/extensions/WEnotes/images/hypothesis.png";
                timeLink = d.we_link;
                break;
            case "medium":
                feedURL = user.feed_url;
                profileURL = user.profile_url;
                profileIMG = "/extensions/WEnotes/images/medium.png";
                timeLink = d.we_link;
                break;
            case "wikieducator":
                profileURL = protocol + "WikiEducator.org/User:" + user;
                userFullname = userFullname || userName;
                break;
            case "twitter":
                timeLink =
                    "https://twitter.com/" + user + "/status/" + d.id_str;
                profileURL = "https://twitter.com/" + user;
                break;
            case "identica":
                timeLink = "https://identi.ca/notice/" + d.id;
                profileURL = user.statusnet_profile_url;
                break;
            case "mastodon":
                timeLink = d.uri;
                profileURL = d.profile_url;
                userFullname = user.name || user.screen_name;
                if (userFullname == "undefined") {
                    userFullname = user.screen_name;
                }
                console.log("timeLink = " + JSON.stringify(timeLink));
                console.log("profileURL = " + JSON.stringify(profileURL));
                console.log(
                    "(mastodon) tag, we_tags, we_tag = " +
                        tag +
                        ", " +
                        d.we_tags +
                        ", " +
                        d.we_tag,
                );
                break;
            case "feed":
                timeLink = d.we_link;
                break;
            case "moodle":
            case "ask":
            case "groups":
                timeLink = d.we_link;
                break;
            case "community":
            case "forums":
            case "connectoeglobal":
            case "saylordiscourse":
            case "milllforum":
            case "discourse":
            case "disourse":
                profileURL = d.profile_url.replace("/users/", "/u/");
                timeLink = d.we_link;
                break;
            case "chat":
                timeLink = d.url;
                break;
            case "wenotes_wp":
                userFullname = d.from_user_name;
                userName = d.from_user;
                profileURL = "";
                timeLink =
                    d.we_origin_schema + "://" + d.we_origin + d.we_origin_path;
                break;
        }

        // This text markup routine derived from one
        // Copyright Kent Brewster 2008  CC-BY-SA-3
        // see http://kentbrewster.com/identica-badge for info
        // FIXME unfortunately \w is too lenient when livening URLs
        origtext = text;
        text = text.replace(/&#(\d+);/g, function (match, match2) {
            return String.fromCharCode(+match2);
        });
        text = text.replace(
            /((http|https):\/\/|\!|@|#)(([\w_]+)?[^\s]*)/g,
            function (sub, type, scheme, url, word) {
                var moniker, parts;
                // insights for this next regex: http://www.regular-expressions.info/possessive.html
                var regex = /[.!?;,'")]+$/;
                url = url.replace(regex, "");
                sub = sub.replace(regex, "");
                if (!word) return sub; // just punctuation
                var label = "";
                var href = "";
                var prefix = "";
                var title = "";

                if (word) {
                    // special case for WikiEducator user names
                    if (type === "@" && source === "wikieducator") {
                        moniker = word;
                    } else if (
                        type === "@" &&
                        (source === "forums" ||
                            source === "saylordiscourse" ||
                            source === "community" ||
                            source === "discourse" ||
                            source === "disourse")
                    ) {
                        moniker = word;
                    } else if (type === "@" && source === "mastodon") {
                        moniker = "@" + word;
                    } else {
                        moniker = word.split("_"); // behaviour with underscores differs
                        if (type === "#") moniker = moniker.join("");
                        else word = moniker = word.toLowerCase();
                    }
                }

                switch (type) {
                    case "http://":
                    case "https://": // html links
                        href = scheme + "://" + url;
                        break;
                    case "@": // link users
                        href = sourceProfile[source] + moniker;
                        break;
                    case "!": // link groups
                        href = "https://identi.ca/group/" + moniker;
                        break;
                    case "#": // link tags
                        console.log("in hashtag...");
                        if (source === "mastodon") {
                            if (d.tags && d.tags.length > 0 && d.tags[0].url) {
                                console.log(
                                    "we've got d.tags.url:",
                                    d.tags[0].url,
                                );
                                console.log("word is ", word);
                                console.log("text is ", text);
                                console.log("origtext is ", origtext);
                                href = d.tags[0].url;
                            } else {
                                href = sourceTag[source] + moniker;
                            }
                        } else {
                            href = sourceTag[source] + moniker;
                        }
                        break;
                }
                if (scheme) {
                    // only urls will have scheme
                    label = sub;
                    if (sub.length > 32) {
                        parts = url.split("/", 2);
                        if (parts.length > 1) {
                            title = sub;
                            label =
                                scheme +
                                "://" +
                                parts[0] +
                                "/" +
                                parts[1].slice(0, 10) +
                                "...";
                        }
                    }
                } else {
                    label = word;
                    prefix = type;
                }
                // only identica has groups
                if (type === "!" && source !== "identica") {
                    return label;
                }
                return (
                    prefix +
                    '<a href="' +
                    href +
                    '" ' +
                    (title ? 'title="' + title + '" ' : "") +
                    'target="_wenotes2">' +
                    label +
                    "</a>"
                );
            },
        );

        // liven abridged marks
        switch (source) {
            case "mastodon":
            case "identica":
            case "bookmarks":
            case "hypothesis":
            case "medium":
                text = text.replace(
                    /\.\.\.$/,
                    '<a href="' + timeLink + '">...</a>',
                );
                break;
            case "moodle":
            case "ask":
            case "feed":
            case "groups":
            case "disourse":
            case "discourse":
            case "community":
            case "forums":
            case "saylordiscourse":
            case "connectoeglobal":
                if (d.truncated) {
                    text =
                        text.substring(0, text.lastIndexOf("...")) +
                        '<a class="external text" href="' +
                        d.we_link +
                        '" target="_wenotes">...</a>';
                }
                break;
        }

        var isDefaultAvatar =
            profileIMG === "" ||
            profileIMG.indexOf("missing.gif") !== -1 ||
            profileIMG.indexOf("missing.jpg") !== -1;

        // if we don't have a profile img or url, use gravatar if available
        if (isDefaultAvatar && d.gravatar) {
            profileIMG =
                "https://www.gravatar.com/avatar/" +
                d.gravatar +
                "?s=48&d=identicon";
            isDefaultAvatar = false;
        }
        if (profileURL === "" && d.gravatar) {
            profileURL = "https://www.gravatar.com/" + d.gravatar;
        }
        if (isDefaultAvatar) {
            profileIMG =
                "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        }

        // set up the actual message published in the feed for each mention
        msg = '<div id="WEitf' + d._id + '" class="WEnote">';
        msg += '<div class="WEnotepic"><a href="' + profileURL + '"><img ';
        if (isDefaultAvatar) {
            // try to make a legal class name, after encoding, encode any
            //   underscores as well... and then replace % with _
            var encName = encodeURIComponent(userName)
                .replace(/_/g, "%5F")
                .replace(/%/g, "_");
            msg += 'class="WEni_' + encName + '" ';
        }
        // WikiEducator images are not necessarily square
        // try to get the width from the URL
        var imgwidth = d.profile_image_width ? d.profile_image_width : 48;
        var imgheight = d.profile_image_height ? d.profile_image_height : 48;
        var mo = profileIMG.match(
            /https:\/\/wikieducator\.org\/.*?\/(\d+)px-[^\/]+/i,
        );
        if (mo) {
            imgwidth = mo[1];
        }
        if (imgwidth > 48 || imgheight > 48) {
            if (imgwidth > imgheight) {
                aspect = imgheight / imgwidth;
                imgwidth = Math.min(imgwidth, 48);
                imgheight = Math.round(imgheight * aspect);
            } else {
                aspect = imgwidth / imgheight;
                imgheight = Math.min(imgheight, 48);
                imgwidth = Math.round(imgwidth * aspect);
            }
        }
        msg +=
            'src="' +
            profileIMG +
            '" height=' +
            imgheight +
            " width=" +
            imgwidth +
            '></a></div><div class="WEnotebody">';
        // it doesn't make sense to link to a user in the case of WEnotes post from WordPress
        if (source === "wenotes_wp") {
            msg +=
                "<b>" +
                userFullname +
                '</b>&nbsp;&nbsp;<span class="WEnoteuser">' +
                "@" +
                userName +
                "</span>";
        } else {
            msg +=
                '<a href="' +
                profileURL +
                '" style="text-decoration: none;">' +
                "<b>" +
                userFullname +
                '</b>&nbsp;&nbsp;<span class="WEnoteuser">' +
                "@" +
                userName +
                "</a></span>";
        }
        // include an RSS Feed Icon link if a feed is defined
        if (feedURL) {
            feedIcon =
                '<img src="/extensions/WEnotes/images/rss_mini.png" alt="RSS feed URL for this person" />';
            msg += '&nbsp;&nbsp;<a href="' + feedURL + '">' + feedIcon + "</a>";
        }
        msg += "<br />";
        msg += text;
        var lang = getLang();
        var created_date = getDate(d.created_at, lang);
        var iso_date = getISODate(d.created_at);

        var dt_ago =
            '<time class="timeago" datetime="' +
            iso_date +
            '">' +
            created_date +
            "</time>";
        msg += '<br /><span class="WEnotesub">';
        if (tag === "_") {
            if (d.we_tags) {
                msg += '<span class="WEtags">';
                for (i = 0; i < d.we_tags.length; i++) {
                    msg += "#" + d.we_tags[i] + "&nbsp;";
                }
            }
            msg += "</span>";
            msg += "&nbsp;&nbsp;";
        }
        if (d.we_source === "feed") {
            msg += '<span title="' + d.we_feed + '">blog</span>';
        } else if (d.we_source === "wenotes_wp" || d.we_source === "course") {
            var coursesite = "course.oeru";
            if (typeof d.we_source_url != "undefined") {
                if (d.we_source_url === "course.oeglobal.org") {
                    coursesite = "course.oeglobal";
                } else if (d.we_source_url === "pacificopencourses.col.org") {
                    coursesite = "pacificcourse.col";
                } else if (d.we_source_url === "course.milll.ws") {
                    coursesite = "course.milll";
                } else if (d.we_source_url === "course.fossdle.org") {
                    coursesite = "course.fossdle";
                } else if (d.we_source_url === "tepukenga.oerfoundation.org") {
                    coursesite = "te pūkenga";
                } else {
                    coursesite = "course.oeru";
                }
            }
            msg += coursesite;
        } else if (d.we_source === "groups") {
            msg += "groups.oeru";
        } else if (d.we_source === "community") {
            msg += "forum.fossdle";
        } else if (d.we_source === "forums") {
            msg += "forum.oeru";
        } else if (d.we_source === "milllforum") {
            msg += "forum.milll";
        } else if (d.we_source === "saylordiscourse") {
            msg += "forum.saylor";
        } else if (d.we_source === "connectoeglobal") {
            msg += "connect.oeglobal";
        } else if (d.we_source === "discourse" || d.we_source === "disourse") {
            src = d.we_source_name;
            if (d.we_source_name === "forums") {
                src = "forum.oeru";
            } else if (d.we_source_name === "community") {
                src = "forum.fossdle";
            } else if (d.we_source_name === "milllforum") {
                src = "forum.milll";
            } else if (d.we_source_name === "connectoeglobal") {
                src = "connect.oeglobal";
            }
            msg += src;
        } else if (d.we_source === "mastodon") {
            if (d.instance) {
                msg += d.instance;
            } else {
                msg += "mastodon.oeru";
            }
        } else if (d.we_source === "hypothesis") {
            msg += "hypothes.is";
        } else {
            msg += d.we_source;
        }
        msg +=
            '&nbsp;&nbsp;&nbsp;<a href="' +
            timeLink +
            '" title="' +
            created_date +
            '" style="text-decoration: none;" target="_wenotes">' +
            dt_ago +
            "</a>";
        if (!novoting && mw.config.get("wgUserName")) {
            var starClass = d.favorited ? "icon-star" : "icon-star-empty";
            var starTitle = d.favorited ? "unfavorite" : "favorite";
            msg +=
                '&nbsp;&nbsp;&nbsp;<i title="' +
                starTitle +
                '" class="' +
                starClass +
                '"></i>';
        }
        msg += '&nbsp;<span class="wevtct"></span>';
        // add the "sysop-only" links to delete the mention
        if ($.inArray("sysop", mw.config.get("wgUserGroups")) > -1) {
            msg +=
                "&nbsp;&nbsp;&nbsp;" +
                '<a href="#" class="WEnd" id="WEnd_' +
                d._id +
                '">del</a>';
        }
        msg += '</span></div><br clear="both" /></div>';
        return msg;
    }

    function pollForUpdates(ix) {
        var dx = wendivs[ix];
        if (dx.pollTimer) {
            clearTimeout(dx.pollTimer);
        }
        var tag = dx.tag || "wikieducator";
        var taglc = tag.toLowerCase();
        var newstylepage =
            typeof site_id !== "undefined" && typeof path_id !== "undefined";

        var apiParams = {
            action: "wenotes",
            mode: "get",
            after: dx.last,
        };
        if (tag !== "_") {
            apiParams.tag = taglc;
        }
        if (newstylepage) {
            apiParams.page = site_id + "-" + path_id;
        }

        api.post(apiParams)
            .done(function (data) {
                try {
                    if (
                        data &&
                        data.wenotes &&
                        data.wenotes.rows &&
                        data.wenotes.rows.length > 0
                    ) {
                        var rows = data.wenotes.rows;
                        // Prepend oldest first
                        for (var i = rows.length - 1; i >= 0; i--) {
                            var msg = rows[i].doc;
                            newPost(ix, msg);
                            if (msg.we_timestamp > dx.last) {
                                dx.last = msg.we_timestamp;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error processing WEnotes poll updates:", e);
                } finally {
                    dx.pollTimer = setTimeout(function () {
                        pollForUpdates(ix);
                    }, 10000);
                }
            })
            .fail(function () {
                dx.pollTimer = setTimeout(function () {
                    pollForUpdates(ix);
                }, 10000);
            });
    }

    function getMore(event) {
        var ix = event.data.ix,
            tag = wendivs[ix].tag,
            taglc = tag.toLowerCase(),
            count = wendivs[ix].moreCount,
            $wenm = $("#WEnotesMore" + ix),
            $wenmdi = $("#WEnotesMoreDiv" + ix + " img");

        $wenmdi.show();
        $wenm.hide();

        var newstylepage =
            typeof site_id !== "undefined" && typeof path_id !== "undefined";
        var apiParams = {
            action: "wenotes",
            mode: "get",
            before: wendivs[ix].first,
            limit: count,
        };
        if (tag !== "_") {
            apiParams.tag = taglc;
        }
        if (newstylepage) {
            apiParams.page = site_id + "-" + path_id;
        }

        api.post(apiParams)
            .done(function (data) {
                if (!data || !data.wenotes || !data.wenotes.rows) {
                    return;
                }
                var i,
                    d,
                    mid = "#WEnotesMoreDiv" + ix,
                    rows = data.wenotes.rows;

                if (rows.length === 0) {
                    $(mid).hide();
                    return;
                }

                var lang = getLang();
                console.log("in return from getMore, got lang " + lang);
                for (i = 0; i < rows.length; i++) {
                    d = rows[i].doc;
                    if (d.we_timestamp > wendivs[ix].last) {
                        wendivs[ix].last = d.we_timestamp;
                    }
                    if (d.we_timestamp < wendivs[ix].first) {
                        wendivs[ix].first = d.we_timestamp;
                    }
                    $(mid).before(formatMessage(d, tag));
                    $("#WEitf" + d._id)
                        .find("time.timeago")
                        .timeago();
                }

                $wenmdi.hide();
                $wenm.show();

                if (rows.length < count) {
                    $(mid).hide();
                }
            })
            .fail(function () {
                $wenmdi.hide();
                $wenm.show();
            });
        return false;
    }

    function WEnotes(ix) {
        var dx = wendivs[ix];
        var tag = dx.tag || "wikieducator";
        var newstylepage = false;
        var taglc = tag.toLowerCase();
        var count = dx.count || 20;

        if (dx.timer) {
            clearTimeout(dx.timer);
        }

        if (typeof site_id !== "undefined" && typeof path_id !== "undefined") {
            newstylepage = true;
        }

        var apiParams = {
            action: "wenotes",
            mode: "get",
            limit: count,
        };
        if (tag !== "_") {
            apiParams.tag = taglc;
        }
        if (newstylepage) {
            apiParams.page = site_id + "-" + path_id;
        }

        api.post(apiParams)
            .done(function (data) {
                if (!data || !data.wenotes || !data.wenotes.rows) {
                    return;
                }
                var i;
                var lid = "#WEnote0_" + ix;
                var rows = data.wenotes.rows;

                if (!dx.nospinner) {
                    wendivs[ix].nospinner = true;
                    dx.$d
                        .find(".WEnotesSpinner")
                        .before('<div id="WEnote0_' + ix + '"></div>');
                    dx.$d.find(".WEnotesSpinner").remove();
                }

                if (
                    !dx.nomore &&
                    data.wenotes.total_rows - data.wenotes.offset > rows.length
                ) {
                    if ($("#WEnotesMoreDiv" + ix).length === 0) {
                        var button_text;
                        if (getLang() === "fr_FR") {
                            button_text = "Plus d'actualités " + tag;
                            if (tag === "_") {
                                button_text = "Plus d'actualités";
                            }
                        } else {
                            button_text = "More " + tag + " notes";
                            if (tag === "_") {
                                button_text = "More notes";
                            }
                        }
                        var $lastNote = dx.$d.find(".WEnote:last");
                        var $insertAfter = $lastNote.length
                            ? $lastNote
                            : $(lid);
                        $insertAfter.after(
                            '<div class="WEnotesMore" id="WEnotesMoreDiv' +
                                ix +
                                '"><img src="/skins/common/images/ajax-loader.gif" />' +
                                '<input id="WEnotesMore' +
                                ix +
                                '" type="submit" value="' +
                                button_text +
                                '" />' +
                                '</div><br clear="all" />',
                        );
                        $("#WEnotesMore" + ix).bind(
                            "click",
                            { ix: ix },
                            getMore,
                        );
                    }
                }

                var ids = [];
                for (i = 0; i < rows.length; i++) {
                    var d = rows[i].doc;
                    if (typeof msg_counter[d.id] === "undefined") {
                        msg_counter[d.id] = 0;
                    }
                    msg_counter[d.id] = msg_counter[d.id] + 1;
                    if (msg_counter[d.id] > 1) {
                        continue;
                    }
                    if (d.we_timestamp > wendivs[ix].last) {
                        wendivs[ix].last = d.we_timestamp;
                    }
                    if (d.we_timestamp < wendivs[ix].first) {
                        wendivs[ix].first = d.we_timestamp;
                    }
                    $(lid).after(formatMessage(d, tag));
                    lid = "#WEitf" + d._id;
                    $(lid).find("time.timeago").timeago();
                    ids.push(d._id);
                }

                if (dx.pollTimer) {
                    clearTimeout(dx.pollTimer);
                }
                dx.pollTimer = setTimeout(function () {
                    pollForUpdates(ix);
                }, 10000);
            })
            .fail(function () {
                dx.timer = setTimeout(function () {
                    $("div.WEnotes:first").triggerHandler("WEnotes", [dx.tag]);
                }, 30000);
            });
    }

    function loadNotesList($div, ids) {
        if (typeof ids === "string") {
            ids = ids.split(",");
        }
        ids = $.grep(ids, function (id) {
            return $.trim(id) !== "";
        });
        if (!ids || ids.length === 0) return;

        api.post({
            action: "wenotes",
            mode: "get",
            ids: ids.join(","),
        }).done(function (data) {
            if (data && data.wenotes && data.wenotes.rows) {
                var rows = data.wenotes.rows;
                for (var i = 0; i < rows.length; i++) {
                    $div.append(formatMessage(rows[i].doc, "_", true));
                }
            }
        });
    }

    // Self-initialise WEnotesList divs
    $("div.WEnotesList").each(function () {
        var $div = $(this);
        var ids = $div.data("ids");
        if (ids) {
            loadNotesList($div, String(ids));
        }
    });

    // Self-initialise WEnotesTop divs
    $("div.WEnotesTop").each(function () {
        var $div = $(this);
        var tag = $div.data("tag");
        var cnt = parseInt($div.data("cnt"), 10) || 5;
        if (!tag) return;
        var taglc = tag.toLowerCase();
        api.post({
            action: "wevotes",
            vopid: "WN" + taglc,
            vomode: "get",
        }).done(function (data) {
            if (data && data.wevotes && data.wevotes.totals) {
                var totals = data.wevotes.totals;
                var unsorted = [];
                for (var vid in totals) {
                    if (totals[vid] > 0) {
                        unsorted.push([totals[vid], vid]);
                    }
                }
                unsorted.sort(function (a, b) {
                    return b[0] - a[0];
                });
                var sorted = [];
                for (var i = 0; i < unsorted.length && i < cnt; i++) {
                    sorted.push(unsorted[i][1]);
                }
                loadNotesList($div, sorted);
            }
        });
    });

    function newPost(ix, message) {
        if (message._id.charAt(0) === "_") {
            return;
        }
        if ($("#WEitf" + message._id).length === 0) {
            if (!message.we_d) {
                var wd = wendivs[ix];
                wd.$d.prepend(formatMessage(message, wd.tag));
                $("#WEitf" + message._id)
                    .find("time.timeago")
                    .timeago();
            }
        } else {
            if (message.we_d) {
                $("#WEitf" + message._id).hide("fast");
            }
        }
    }

    function WEnotesHandler(event, tag) {
        $.each(wendivs, function (i, v) {
            // Skip if tag filter is active and neither the widget tag matches
            // nor the widget is showing all tags (tag '_' is a wildcard).
            if (
                tag &&
                v.tag &&
                v.tag !== "_" &&
                v.tag.toLowerCase() !== tag.toLowerCase()
            ) {
                return;
            }
            // If a tag is supplied this is a post notification — use
            // pollForUpdates to fetch and prepend only the new note
            // immediately rather than re-fetching the full list.
            // Without a tag it is an initial load, so use WEnotes().
            if (tag) {
                if (wendivs[i].pollTimer) {
                    clearTimeout(wendivs[i].pollTimer);
                }
                pollForUpdates(i);
            } else {
                WEnotes(i);
            }
        });
        return false;
    }

    // find the current language setting, if any. Otherwise, return en_NZ
    function getLang() {
        var wenlang = "en_NZ";
        $("div.WEnotes").each(function () {
            var $details = $(this).attr("class").split(/\s+/);
            $.each($details, function (i, v) {
                if (v.indexOf("WEnotes-") === 0) {
                    var args = v.split("-");
                    if (args.length > 3) {
                        wenlang = args[4] !== "" ? args[4] : "en_NZ";
                        if (wenlang == "fr_FR") {
                            $.extend(
                                ($.timeago.settings.strings = {
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
                                    years: "%d ans",
                                }),
                            );
                        }
                    }
                }
            });
        });
        return wenlang;
    }

    function getISODate(date) {
        try {
            var dt = new Date(date);
            if (!isNaN(dt.getTime())) {
                return dt.toISOString();
            }
        } catch (e) {}
        return new Date().toISOString();
    }

    function getDate(date, lang) {
        try {
            var dt = new Date(date);
            if (!isNaN(dt.getTime())) {
                lang =
                    typeof lang !== "undefined"
                        ? lang.replace("_", "-")
                        : "en-US";
                var options = {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                };
                return dt.toLocaleDateString(lang, options);
            }
        } catch (e) {}
        return date || "";
    }

    // Initialise all WEnotes divs on the page
    $("div.WEnotes").each(function () {
        var $thisd = $(this);
        var classes = $(this).attr("class").split(/\s+/);
        $.each(classes, function (i, v) {
            if (v.indexOf("WEnotes-") === 0) {
                var tag;
                var args = v.split("-", 5);
                if (args.length > 2) {
                    tag = args[2];
                    wendivs.push({
                        $d: $thisd,
                        count: args[1],
                        tag: tag,
                        context: args[3],
                        language: args[4],
                        last: "2011-01-01T00:00:00.000Z",
                        first: "2999-12-31T23:59:59.999Z",
                        moreCount: 20,
                    });
                }
            }
        });
    });

    $("div.WEnotes,div.WEnotesList")
        .on("click", ".icon-star, .icon-star-empty", like)
        .on("click", ".icon-mail-reply, .icon-th-list", windowConv)
        .on("click", "a.WEnd", function () {
            var id = $(this).attr("id").split("_")[1];
            api.postWithEditToken({
                action: "wenotes",
                id: id,
            })
                .done(function () {
                    console.log("deleting mention designated by " + id);
                    $("#WEitf" + id).hide("fast");
                })
                .fail(function () {
                    alert("unable to delete");
                });
            return false; // we got this
        });

    $("div.WEnotes").on("WEnotes", WEnotesHandler);

    if (wendivs.length) {
        console.log("wendivs has length " + wendivs.length);
        $("div.WEnotes:first").triggerHandler("WEnotes");
    }
})(mediaWiki, jQuery);
