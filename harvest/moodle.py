#!/usr/bin/python

# Copyright 2012 Open Education Resource Foundation
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import re
import time
from datetime import datetime
import cookielib
import urllib, urllib2
import couchdb
import feedparser
import lxml.html
import sys
import json

# retrieve URL including authentication credentials from config JSON
couchserver = json.load(open('couchserver.json', 'rt'))
couch = couchdb.Server(couchserver['url'])
db = couch[couchserver['db']]

# get the last time for a moodle post in the database
view = db.view('ids/moodle', descending=True, limit=1)
if len(view) == 1:
    for row in view:
        lasttime = row.key
else:
    lasttime = "2000-01-01T00:00:00.000Z"

feeds = ['http://moodle.wikieducator.org/rss/file.php/4733/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/146/rss.xml', # News Forum
        'http://moodle.wikieducator.org/rss/file.php/4734/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/147/rss.xml', # Introduce
        'http://moodle.wikieducator.org/rss/file.php/4735/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/148/rss.xml', # Open
        'http://moodle.wikieducator.org/rss/file.php/4742/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/150/rss.xml', # Getting to know you
        'http://moodle.wikieducator.org/rss/file.php/4750/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/151/rss.xml', # Barriers
        'http://moodle.wikieducator.org/rss/file.php/4765/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/152/rss.xml', # Case study
        'http://moodle.wikieducator.org/rss/file.php/4783/5e63bb7b7687d7273662e7a773fe7f3a/mod_forum/153/rss.xml' # NC or not to NC
        ]

cj = cookielib.CookieJar()
moodle = urllib2.build_opener(urllib2.HTTPCookieProcessor(cj))
data = urllib.urlencode({'username': couchserver['moodleuser'],
                        'password': couchserver['moodlepass']})

li = moodle.open('http://moodle.wikieducator.org/login/index.php', data)

feedno = 0
for feed in feeds:
    rss = feedparser.parse(feed)
    feedtitle = rss['channel']['title']

    items = rss['items']
    items.reverse()

    for item in items:
        if item['title'] == 'RSS Error' and item['description'] == 'Error reading RSS data':
            break
        truncated = False
        dt = datetime.strptime(item['date'], '%a, %d %b %Y %H:%M:%S GMT')
        we_timestamp = dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        if we_timestamp <= lasttime:
            continue
        seconds = time.mktime(dt.timetuple())
        # strip out HTML markup before abridging, so we don't stop midtag
        abridged = re.sub(r'<[^>]*>', '', item['summary'])
        abridged = re.sub(r'\s*by [^.]+\.\n?', '', abridged)
        abridged = abridged[:500].strip()
        abridged = abridged.replace('&nbsp;', ' ')
        abridged = abridged.replace('\n', ' ')
        i = len(abridged)
        if i > 137:
            i = 137
            while abridged[i] != ' ' and i > 0:
                i -= 1
            abridged = abridged[:i] + '...'
            truncated = True

        # fetch the original article, try to find author/img
        f = moodle.open(item['link'])
        html = lxml.html.parse(f).getroot()
        authordiv = html.find_class('author')[0]
        author = authordiv.findtext('a')
        profile_url = authordiv.find('a').attrib['href']
        pics = html.find_class('userpicture')
        attrs = pics[0].attrib
        imgurl = attrs['src']
        mention = {
                'from_user': author,
                'from_user_name': author,
                'created_at': item['date'],
                'profile_image_url': imgurl,
                'text': abridged,
                'truncated': truncated,
                'id': '%d%02d' % (seconds, feedno),
                'profile_url': profile_url,
                'we_source': 'moodle',
                'we_feed': feedtitle,
                'we_tag': 'ocl4ed',
                'we_timestamp': we_timestamp,
                'we_link': item['link']
                }
        db.save(mention)
    feedno += 1

