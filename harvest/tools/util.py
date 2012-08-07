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
options = json.load(open('options.json', 'rt'))
couch = couchdb.Server(options['url'])
db = couch[options['db'])

for id in db:
    doc = db[id]
    if doc['we_source'] == 'twitter' and doc['we_tag'] == 'oeru':
        hashtags = doc['entities']['hashtags']
        print id, hashlib.sha1(doc['text'].encode('utf-8')).hexdigest()
        print " ",
        for v in range(len(hashtags)):
            print hashtags[v]['text'],
        print


