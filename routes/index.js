module.exports = function(app){

	var options = {
		a2:{
			config: {
				url: app.config.a2.a2ApiPath,
				headers: {
					'user-agent': 'Apache-HttpClient/4.2.2 (java 1.5)',
			    	'host': app.config.a2.a2Url,
			    	'connection': 'keep-alive',
			    	'content-type': 'application/json'
			  	}
			}
		}
	};

    var auth = function(level){
		return function(req, res, next) {
			if (req.session && req.session.user)
				return next();
			else{
				var pre = '';
				for(var i = 0; i < level; i++){
					pre += '../';
				}
				return res.redirect(pre + 'users/login');
			}
		};
	};

	var express = require('express'),
    router = express.Router();

    router.get('/', auth(0), function(req, res, next) {
		res.redirect('webhooks');
	});

    app.use('/', router);

	app.use('/users', require('./user.js')(auth(1), options));
	app.use('/webhooks', require('./webhooks.js')(auth));
	app.use('/events', require('./events.js')(auth, app.queue));
}
