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
import HTMLParser

# retrieve URL including authentication credentials from config JSON
couchserver = json.load(open('couchserver.json', 'rt'))
couch = couchdb.Server(couchserver['url'])
db = couch[couchserver['db']]
h = HTMLParser.HTMLParser()

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

feed = 'http://ask.oeruniversity.org/feeds/atom/?tags=ocl4ed'
qfeed = 'http://ask.oeruniversity.org/feeds/questiona/%s/'
qpattern = re.compile(r'http://ask.OERuniversity.org/question/(?P<q>\d+)')

# find all of the questions
rss = feedparser.parse(feed)
qitems = rss['items']
qitems.reverse()

qs = []
for qitem in qitems:
    mo = qpattern.match(qitem['link'])
    if mo:
        qs.append(mo.group('q'))
print qs

# for each of the questions, find the new questions, answers, comments
for q in qs:
    rss = feedparser.parse(qfeed % q)
    feedtitle = rss['channel']['title']

    items = rss['items']

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
        abridged = h.unescape(abridged)
        #abridged = re.sub(r'\s*by [^.]+\.\n?', '', abridged)
        abridged = re.sub(r'\s+', ' ', abridged)
        abridged = re.sub(r'(Comment|Answer) by (.*?) for', r'\1 for',
                abridged, 1)
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

        print item
        print '----',q
        print item['title']
        print '++'
        print item['summary']
        print '++'

        mention = {
                'from_user': author,
                'from_user_name': author,
                'created_at': item['date'],
                'profile_image_url': 
                    gravatar(item['author_detail']['email']),
                'text': abridged,
                'truncated': truncated,
                'id': '%d%05d' % (seconds, int(q)),
                'profile_url': item['author_detail']['href'],
                'we_source': 'ask',
                'we_feed': '%s: %d' % (feedtitle, int(q)),
                'we_tag': 'ocl4ed',
                'we_timestamp': we_timestamp,
                'we_link': item['link']
                }
        print mention
        print '==========='
        continue
        db.save(mention)
