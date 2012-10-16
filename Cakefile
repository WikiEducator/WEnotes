fs = require 'fs'
util = require 'util'

files = [
  './jquery-timeago/jquery.timeago.js',
  './node_modules/faye/browser/faye-browser.js',
  'WEnotes.js']
contents = []

task 'min', 'build minified WEnotes client', (options) ->
  fs.readFile "WEnotesClient.js", 'utf8', (err, code) ->
    util.log err if err
    try
      util.log "creating WEnotes-min.js"
      {parser, uglify} = require 'uglify-js'
      ast = parser.parse code
      code = uglify.gen_code uglify.ast_squeeze uglify.ast_mangle ast, extra: yes
      fs.writeFile "WEnotes-min.js", code

task 'build', 'build WEnotes client', (options) ->
  fileCnt = files.length
  for file, index in files
    util.log "loading #{file}"
    do (file, index) ->
      fs.readFile file, 'utf8', (err, data) ->
        util.log err if err
        contents[index] = data
        process() if --fileCnt is 0

process = ->
  code = contents.join "\n\n"
  fs.writeFile "WEnotesClient.js", code, (err, data) ->
    util.log err if err
    invoke 'min'

