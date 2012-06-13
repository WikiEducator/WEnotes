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
import couchdb
import feedparser
import sys
import json
import hashlib

# retrieve URL including authentication credentials from config JSON
couchserver = json.load(open('couchserver.json', 'rt'))
couch = couchdb.Server(couchserver['url'])
db = couch[couchserver['db']]

# get the last time for a moodle post in the database
view = db.view('ids/ask', descending=True, limit=1)
if len(view) == 1:
    for row in view:
        lasttime = row.key
else:
    lasttime = "2000-01-01T00:00:00.000Z"

print "lasttime", lasttime

def gravatar(e):
    return 'http://www.gravatar.com/avatar/' + \
            hashlib.md5(e.strip().lower()).hexdigest() + '?s=48'

feeds = ['http://ask.oeruniversity.org/feeds/atom/?tags=ocl4ed']

feedno = 98 # avoid conflicts with Moodle feeds
for feed in feeds:
    rss = feedparser.parse(feed)
    feedtitle = rss['channel']['title']

    items = rss['items']
    items.reverse()

    for item in items:
        if item['title'] == 'RSS Error' and item['description'] == 'Error reading RSS data':
            break
        truncated = False
        print item['date']
        #try:
        dt = datetime.strptime(item['date'], '%Y-%m-%dT%H:%M:%S+00:00')
        #except ValueError:
        #    dt = datetime.strptime(item['date'], '%Y-%m-%dT%H:%M:%S+00:00')
        we_timestamp = dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')
        if we_timestamp <= lasttime:
            continue
        seconds = time.mktime(dt.timetuple())
        # strip out HTML markup before abridging, so we don't stop midtag
        body = item['title'] + ' ' + item['summary']
        abridged = re.sub(r'<[^>]*>', '', body)
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

        author = item['author_detail']['name']
        profile_url = ''

        print item
        print '----'

        mention = {
                'from_user': author,
                'from_user_name': author,
                'created_at': item['date'],
                'profile_image_url': 
                    gravatar(item['author_detail']['email']),
                'text': abridged,
                'truncated': truncated,
                'id': '%d%02d' % (seconds, feedno),
                'profile_url': profile_url,
                'we_source': 'ask',
                'we_feed': feedtitle,
                'we_tag': 'ocl4ed',
                'we_timestamp': we_timestamp,
                'we_link': item['link']
                }
        print mention
        print '==========='
        continue
        db.save(mention)
    feedno += 1

