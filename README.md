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

This repository includes the client side tools for displaying and
capturing notes. Check the
[WEnotes-tools](https://github.com/WikiEducator/wenotes-tools/)
repository for the harvesting tools.

## Building

After cloning this repository, you must:
* ensure you install the set of Node JS dependencies by running `npm install` in this directory, which will install the libraries (and their dependencies) listed in package.json
* run `make` to build minified versions of the client side tools
* you can then optionally remove the `node_modules` tree
