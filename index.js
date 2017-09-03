#!/usr/bin/env node

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const mime = require('mime');


const program=require('commander');

function collect(val, memo) {
  memo.push(val);
  return memo;
}
program
	.option('-p, --port', 'server port, default as 3000')
	.option('-m, --middlewares', 'list of file names for middleware scripts', collect, [])
	.option('-h, --history', 'whether to support http5 history api, as webpackDevServer "historyApiFallback"')
	.parse(process.argv);

const port = program.port || 3000;
const middlewares=program.middlewares;

if(history in program){
	process.env.HISTORY_INDEX=program.history||'/index.html';
}

process.on('SIGINT', function(){
	console.log('quit.');
	process.exit();
});

http.createServer(function (req, res) {
	console.log(`${req.method} ${req.url}`);
	if(middlewares){
		const cwd=process.cwd();
		middlewares.forEach(function(el){
			el=require(path.resolve(cwd, el));
			if(el&&el(req, res))return;
		})
	}
	// parse URL
	const parsedUrl = url.parse(req.url);
	// extract URL path
	let pathname = `.${parsedUrl.pathname}`;
	fs.exists(pathname, function (exist) {
		if(!exist) {
			if(process.env.HISTORY_INDEX&&fs.exists(process.env.HISTORY_INDEX)){
				pathname=process.env.HISTORY_INDEX;
			}else{
				// if the file is not found, return 404
				res.statusCode = 404;
				res.end(`File ${pathname} not found!`);
				return
			}
		}
		// if is a directory, then look for index.html
		if (fs.statSync(pathname).isDirectory()) {
			pathname += '/index.html';
		}
		// read file from file system
		fs.readFile(pathname, function(err, data){
			if(err){
				res.statusCode = 500;
				res.end(`Error getting the file: ${err}.`);
			} else {
				// based on the URL path, extract the file extention. e.g. .js, .doc, ...
				const ext = path.parse(pathname).ext;
				// if the file is found, set Content-type and send data
				res.setHeader('Content-type', mime.lookup(ext));
				res.end(data);
			}
		});
	});
}).listen(parseInt(port));
console.log(`Server listening on port ${port}`);
