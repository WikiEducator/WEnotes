#WEnotes-min.js:	WEnotesClient.js
#	uglifyjs WEnotesClient.js -c -m > WEnotes-min.js

WEnotesClient.js: WEnotes.js jquery-timeago/jquery.timeago.js node_modules/faye/browser/faye-browser.js
	/bin/cat jquery-timeago/jquery.timeago.js node_modules/faye/browser/faye-browser.js \
		WEnotes.js > WEnotesClient.js

