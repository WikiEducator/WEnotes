WEnotes-min.js:	WEnotesClient.js
	node_modules/.bin/uglifyjs WEnotesClient.js -c -m > WEnotes-min.js

WEnotesClient.js: WEnotes.js
	/bin/cat node_modules/timeago/jquery.timeago.js \
		WEnotes.js > WEnotesClient.js

clean:
	rm WEnotes-min.js && mv WEnotesClient.js WEnotesClient.js-prev 
