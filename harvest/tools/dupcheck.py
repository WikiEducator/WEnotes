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

import couchdb
import hashlib
import json

# retrieve URL including authentication credentials from config JSON
couchserver = json.load(open('couchserver.json', 'rt'))
couch = couchdb.Server(couchserver['url'])
db = couch[couchserver['db'])

tags = ['wikieducator', 'oeru', 'ocl4ed']
services = ['twitter', 'identica']

"""
# dup by text content
print '============== check by text content ============='
for tag in tags:
    print tag
    for service in services:
        print service
        sums = {}
        for id in db:
            doc = db[id]
            if doc['we_source'] == service and doc['we_tag'] == tag:
                sha1 = hashlib.sha1(doc['text'].encode('utf-8')).hexdigest()
                if sums.has_key(sha1):
                    print 'duplicates:', sums[sha1], id
                    if service == 'twitter':
                        hashtags = doc['entities']['hashtags']
                        print " ",
                        for v in range(len(hashtags)):
                            print hashtags[v]['text'],
                        print
                else:
                    sums[sha1] = id
"""

# dup by timestamp
print '============== check by timestamp ============='
for tag in tags:
    print tag
    #for service in services:
    for service in ['twitter']:
        print service
        stamps = {}
        for id in db:
            doc = db[id]
            if doc['we_source'] == service and doc['we_tag'] == tag:
                stamp = doc['we_timestamp']
                if stamps.has_key(stamp):
                    print 'duplicates:', stamps[stamp], id
                    if service == 'twitter':
                        hashtags = doc['entities']['hashtags']
                        print " ",
                        for v in range(len(hashtags)):
                            print hashtags[v]['text'],
                        print
                else:
                    stamps[stamp] = id


