module.exports = function(auth, getBasePath, queue){

	var express = require('express'),
    router = express.Router();
    var async = require('async');

	var eventTypeLib = require('../lib/eventtype.js');
	var glpHandler = require('../lib/glphandler.js');
	var userHandler = require('../lib/userhandler.js');

	/* GET mis clases view page. */
	router.get('/', auth(1), function(req, res, next) {
		var event_types = [];
		var db = req.db;

		async.waterfall([
			eventTypeLib.listEventTypes(db,{},event_types)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.render('eventtype_list', {basePath: getBasePath(req), title: 'Event Types', event_types: event_types});
		});
	});

	router.post('/', auth(1), function(req, res, next){
		var event_type = new eventTypeLib.EventType(req.db, req.body);

		event_type.save(function(err,result){
			res.redirect('./events/');
		});
	});

	router.get('/delete/:event_type_id', auth(2), function(req, res, next) {
		var event_type = new eventTypeLib.EventType(req.db, {_id: req.params.event_type_id});

		event_type.load(function(err, result){
			if(err)
				return next(new Error(err));

			event_type.delete(function(err,result){
				if(err)
					return next(new Error(err));

				res.redirect('../../events/');
			});
		});
	});

	router.post('/collector/:event_code', function(req, res, next){
		if(req.params.event_code === 'glp_assigned'){
			glpHandler.assigned(req.body, req.app.config, req.app.esClient, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json(result);
				}
			});
		} else if(req.params.event_code === 'user_created'){
			userHandler.create(req.body, req.app.config, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json(result);
				}
			});
		} else if(req.params.event_code === 'group_created'){

	        var teacher = req.headers['x-gleaner-user'];
	        if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

			userHandler.createGroup(req.body, teacher, req.app.config, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json(result);
				}
			});
		} else {
			var event_type = new eventTypeLib.EventType(req.db, {code: req.params.event_code});

			event_type.load(function(err,result){
				if(err){
					res.status(400).send({message: 'Event code not found.'});
					return;
				}else{
					queue.Send(JSON.stringify({event: event_type.code, body: req.body}), function(e, r){
						if(e){
							res.status(400).send({message: 'Body is not a JSON:' + e});
						}else{
							res.send({message: 'success'});
						}
					});
				}
			});
		}
	});

	router.post('/test', function(req, res, next){
		console.log("---- Event Received (" + req.headers['x-analytics-event'] + "): " + JSON.stringify(req.body));

		res.send({message: 'success'});
	});

	return router;
}