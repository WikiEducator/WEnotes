WEnotes
====

WEnotes consists of several parts:

* harvesting tools for:
    * ASKBOT (special RSS feed)
    * blogs (db table of RSS feeds)
    * g+
    * identica (defunct)
    * Moodle instances (special RSS feed)
    * Twitter
    * [GroupServer](http://groupserver.org/) mailing lists (special RSS feed)
    
* a Mediawiki extension
    * verifies user is logged in
    * saves local post

* Mediawiki Widget for collecting local microblog postings

* Mediawiki Widget for displaying an integrated display of all notes

This repository includes the client side tools for displaying and
capturing notes. Check the
[WEnotes-tools](https://bitbucket.org/wikieducator/wenotes-tools)
repository for the harvesting/aggregating tools.

WEnotes harvests posts from a variety of sources and aggregates them
in a [CouchDB](http://couchdb.apache.org/) instance. Some sources are
streamed in near real time and others are polled periodically.  A
[Faye](http://faye.jcoglan.com/) publish-subscribe messaging system
posts the messages to interested clients.

