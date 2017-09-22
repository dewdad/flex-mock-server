#!/usr/bin/env node

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const mime = require('mime');


const program=require('commander');

//function collect(val, memo) {
//  memo.push(val);
//  return memo;
//}
program
	.option('-d, --debug', 'log debug info')
	.option('-p, --port', 'server port, default as 3000')
	.option('-c, --cwd [dir]', 'current working directory, default to process.cwd()')
	.option('-m, --middleware [file]', 'middleware file path; function(req, res); if handled, return true;')
	.option('-i, --index [file]', 'default html page file name for **existing** folder')
	.option('-5, --html5 [file]', 'whether to support html5 history api, as webpackDevServer "historyApiFallback", which is a path resorting to when directory **non-exists**; if "true" set to "index", or specify specifically, relative to where server starts;')
	.option('-r, --root [dir]', 'virtual root directory, as webpack "publicPath", starts with "/", which will be removed when match file;')
	.option('-M, --mock [dir]', 'api directory, rewrites to "mock";')
	.parse(process.argv);
//if <>|[], its bool;

const log= program.debug? console.log.bind(console) :function(){};

log('options:', program);

const port = program.port || 3000;


const cwd = program.cwd || process.cwd();

const middleware=program.middleware?require(path.resolve(cwd, program.middleware)):null;

let rootLen=0;
if(program.root){
	rootLen=program.root.length;
	if(program.root.endsWith('/')){//user may not input trailing slash;
		rootLen--;
		program.root=program.root.substr(0, rootLen);
	}
}

let mockLen=0;
if(program.mock){
	mockLen=program.mock.length;
	if(program.mock.endsWith('/')){//user may not input trailing slash;
		mockLen--;
		program.mock=program.mock.substr(0, mockLen);
	}
}

let Index=program.index||'index.html';

let HistoryIndex;
if(program.html5){
	HistoryIndex=program.html5=="true"?Index:program.html5;
	HistoryIndex='/'+HistoryIndex;
	log('none-exist directory resorts to: ', HistoryIndex);
	if(!fs.existsSync('.'+HistoryIndex)){
		console.error('this resorted html5 history file does not exist');
		process.exit();
	}
}

process.on('SIGINT', function(){
	console.log('quit.');
	process.exit();
});

http.createServer(function (req, res) {
	console.log(`${req.method} ${req.url}`);
	if(middleware&&middleware(req, res)){
		console.log('middleware handled');
		return;
	}
	// parse URL
	const parsedUrl = url.parse(req.url);
	let pathname;
	// extract URL path
	if(rootLen && parsedUrl.pathname.startsWith(program.root)){
		pathname=parsedUrl.pathname.substr(rootLen);
	}else{
		pathname = parsedUrl.pathname;
	}
	log('pathname', pathname);

	fs.exists('.'+pathname, function (exist) {
		if(!exist) {
			//api rewrite:
			if(mockLen && pathname.startsWith(program.mock)){
				pathname=`/mock${pathname.substr(mockLen)}.json`;
			}else if(HistoryIndex){//resort only when directory;
				log('resorting...');
				pathname=HistoryIndex;
			}else{
				// if the file is not found, return 404
				console.log('none:', pathname)
				res.statusCode = 404;
				res.end(`File ${pathname} not found!`);
				return;
			}
		}
		// if a directory, then look for index file (directory exists, so not html5 resort scenario)
		if(fs.statSync('.'+pathname).isDirectory()){
			if(!pathname.endsWith('/')){
				pathname+='/';
			}
			pathname += Index;
		}
		console.log('--serve with file:', pathname);
		// read file from file system
		fs.readFile('.'+pathname, function(err, data){
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
