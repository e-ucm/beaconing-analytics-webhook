/* GET home page. */

module.exports = function(auth, getBasePath, options){
	var request = require('request');

	var options = options['a2']["config"];

	var express = require('express'),
    router = express.Router();

	router.get('/', auth, function(req, res, next) {
		res.redirect('/webhooks/');
	});

	/* GET login page. */
	router.get('/login', function(req, res, next) {
		res.render('login', {basePath: getBasePath(req), title: 'Admin login' });
	});

	router.get('/logout', function(req, res, next){
		req.session.user = null;
		res.redirect('login');
	})

	/* POST to login teacher */
	router.post('/login', function(req, res) {
		this.options = cloneOptions();

		this.options.url += "login";
		this.options.method = "POST";
		this.options.body = JSON.stringify({username: 'root', password: req.body.password});

		console.info(this.options.body);

		request(this.options, function(error, response, body){

			if (!error && response.statusCode == 200) {
				req.session.user = JSON.parse(body).user;
				res.redirect('/webhooks');
			}else
				res.send("Login error: " + error);
		})
	});

	function cloneOptions(){
		return JSON.parse(JSON.stringify(options));
	}

	return router;
}