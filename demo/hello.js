const url = require('url');
module.exports=function(req, res){
	if(url.parse(req.url).pathname=='/hello'){
		res.setHeader('Content-type', 'text/html');
		res.end('<h1>Hello</h1>');
		return true;
	}
};
