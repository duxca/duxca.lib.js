STANDALONE = P2PRingNet

.PHONY: init update clean start stop build

init:
	make clean
	make update
	make start

update:
	if [ ! -d lib ]; then mkdir lib; fi
	if [ ! -d dist ]; then mkdir dist; fi
	rm -rf bower_components node_modules typeings
	npm update
	bower update; dtsm fetch
	dtsm update --save

clean:
	rm -rf lib dist

start:
	http-server -o --silent -p 8000 &\
	watchify lib/index.js --standalone $(STANDALONE) -o dist/$(STANDALONE).js -v &\
	gulp watch &\
	peerjs --port 9000 --debug

stop:
	killall -- node */http-server -p 8000
