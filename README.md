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


WEnotes harvests posts from a variety of sources and aggregates them
in a [CouchDB](http://couchdb.apache.org/) instance. Some sources are
streamed in near real time and others are polled periodically.  A
[Faye](http://faye.jcoglan.com/) publish-subscribe messaging system
posts the messages to interested clients.

This repository includes the client side tools for displaying and
capturing notes. Check the
[WEnotes-tools](https://git.oeru.org/oeru/wenotes-tools/)
repository for the harvesting tools. Also see [WEnotes-server](https://git.oeru.org/oeru/wenotes-server)
for the stack of tools which manages the distribution of the aggregated feeds.
If you want to host your own instance of this, we encourage you to use our [Docker Compose
hosting configuration](https://git.oeru.org/oeru/wenotes-docker)


Notes:

* to clone this archive, you must (after the initial clone) run
    git submodule init
    git submodule update
* ensure you install the set of Node JS dependencies by running `npm install` in this directory, which will install the libraries (and their dependencies) listed in package.json
