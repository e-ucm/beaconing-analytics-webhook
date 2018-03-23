module.exports = function(auth, getBasePath, queue){

	var express = require('express'),
    router = express.Router();
    var async = require('async');

	var eventTypeLib = require('../lib/eventtype.js');
	var glpHandler = require('../lib/glphandler.js');
	var userHandler = require('../lib/userhandler.js');

	var checkArray = function(a, res){
		if(a && !Array.isArray(a)){
        	res.status(400);
			res.json({message: 'Participants lists must be arrays'});
			return false;
        }

        if(a && a.length > 0){
        	for (var i = a.length - 1; i >= 0; i--) {
        		if(!Number.isInteger(a[i])){
		        	res.status(400);
					res.json({message: 'All participants should be integer'});
					return false;
        			break;
        		}
        	}
        }

        return true;
	}


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
			if(!req.body.id){
	        	res.status(400);
				return res.json({message: 'Missing user id'});
	        }

	        if(!req.body.username){
	        	res.status(400);
				return res.json({message: 'Missing user username'});
	        }

	        if(!req.body.role){
	        	res.status(400);
				return res.json({message: 'Missing user role'});
	        }

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

			if(!req.body.id){
	        	res.status(400);
				return res.json({message: 'Missing group id'});
	        }

	        if(!req.body.name){
	        	res.status(400);
				return res.json({message: 'Missing group name'});
	        }

	        if(!checkArray(req.body.students, res)){
				return;
	        }

			userHandler.createGroup(req.body, teacher, req.app.config, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json(result);
				}
			});
		} else if(req.params.event_code === 'group_participants_added'){

	        var teacher = req.headers['x-gleaner-user'];
	        if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

	        if(!req.body.id){
	        	res.status(400);
				return res.json({message: 'Missing group id'});
	        }

	        if(!req.body.participants){
	        	res.status(400);
				return res.json({message: 'Missing participants object'});
	        }

	        iif(!checkArray(req.body.participants.students, res) || !checkArray(req.body.participants.teachers, res)){
				return;
	        }

			userHandler.transformAndAddParticipans(req.body, teacher, req.app.config, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json(result);
				}
			});
		} else if(req.params.event_code === 'group_participants_removed'){

	        var teacher = req.headers['x-gleaner-user'];
	        if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

	        if(!req.body.id){
	        	res.status(400);
				return res.json({message: 'Missing group id'});
	        }

	        if(!req.body.participants){
	        	res.status(400);
				return res.json({message: 'Missing participants object'});
	        }

	        if(!checkArray(req.body.participants.students, res) || !checkArray(req.body.participants.teachers, res)){
				return;
	        }

			userHandler.transformAndRemoveParticipans(req.body, teacher, req.app.config, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json(result);
				}
			});
		} else if(req.params.event_code === 'group_removed'){

	        var teacher = req.headers['x-gleaner-user'];
	        if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

	        if(!req.body.id){
	        	res.status(400);
				return res.json({message: 'Missing group id'});
	        }

			userHandler.removeGroup(req.body.id, teacher, req.app.config, function(error, result){
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