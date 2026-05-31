# WEnotes

WEnotes consists of several parts:

* harvesting tools for:
    * ASKBOT (special RSS feed) (defunct)
    * blogs (db table of RSS feeds)
    * g+ (defunct)
    * [GroupServer](http://groupserver.org/) mailing lists (special RSS feed) (defunct)
    * identica (defunct)
    * Moodle instances (special RSS feed)
    * Twitter
    * various Mastodon instances
    * various Discourse instances

* a Mediawiki extension
  * provides API access to the WEnotes feed
  * verifies user is logged in
  * saves local post
  * allows saving personal favorites

* MediaWiki widgets for:
  * collecting local microblog posts
  * displaying an integrated display of all notes
  * or all notes matching a specific tag
  * displaying a specific range of notes

WEnotes harvests posts from a variety of sources and aggregates them
in the MediaWiki database. Some sources are
streamed in near real time and others are polled periodically.
Clients periodically poll the MediaWiki API for new posts.

This repository includes the wiki side tools for displaying and
capturing notes. Check the
[WEnotes-tools](https://github.com/WikiEducator/wenotes-tools/)
repository for the harvesting tools.

## timeago

This repository includes a vendored copy of [Timeago](https://timeago.yarp.com),
a jQuery plugin for human-friendly timestamps. It is released under its own
MIT License.

Copyright (c) 2008-2019 Ryan McGeary

MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

