WEnotes-min.js:	WEnotesClient.js
	node_modules/.bin/terser WEnotesClient.js -c -m -o WEnotes-min.js

WEnotesClient.js: WEnotes.js
	/bin/cat node_modules/timeago/jquery.timeago.js \
		WEnotes.js > WEnotesClient.js

clean:
	rm WEnotes-min.js && mv WEnotesClient.js WEnotesClient.js-prev
