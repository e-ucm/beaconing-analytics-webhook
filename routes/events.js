module.exports = function(auth, getBasePath, queue){

	var express = require('express'),
    router = express.Router();
    var async = require('async');

	var eventTypeLib = require('../lib/eventtype.js');
	var glpHandler = require('../lib/glphandler.js');
	var userHandler = require('../lib/userhandler.js');

	/**
	 * Checks if an object is valid to send it to UserHandler, having participants
	 * (teachers and/or students), and every participant being a int as external IDs
	 * are integers
	 * @param  {object} a   The object to be checked
	 * @param  {object} res The response object to send error if there is.
	 * @return {object}     True or false if it's a correct object. If fails sends status and result
	 */
	var checkParticipantsObject = function(a, res){
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
		if(req.params.event_code === 'room_created'){
			var teacher = req.headers['x-gleaner-user'];
	        if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

	        if(!req.body.id){
	        	res.status(400);
				return res.json({message: 'Missing room id'});
	        }

	        if(!req.body.name){
	        	res.status(400);
				return res.json({message: 'Missing room name'});
	        }

	        userHandler.createGroup(req.body, teacher, req.app.config, function(error, room){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json({success: true, message: 'room created'});
				}
			});
	    } else if(req.params.event_code === 'puzzle_created'){
	    	var teacher = req.headers['x-gleaner-user'];

	    	if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

	        if(!req.body.room){
	        	res.status(400);
				return res.json({message: 'Missing group id'});
	        }

	        userHandler.getClass(req.body.room, teacher, req.app.config, function(error, room){
	        	if(error){
					res.status(400);
					res.json(error);
				}else{
					glpHandler.createActivity(
						req.body.name,
						req.app.config.formalz.gameId, 
						req.app.config.formalz.versionId,
						room._id,
						teacher,
						null,
						null,
						req.app.config,
					function(error, activity){
						if(error){
							res.status(400);
							res.json(error);
						}else{
							glpHandler.updateDashboard(
								activity._id,
								JSON.parse(glpHandler.formalzTemplate(activity._id)),
								req.app.config,
							function(error, result){
								if(error){
									res.status(400);
									res.json(error);
								}else{
									glpHandler.startActivity(
										activity._id,
										teacher,
										req.app.config,
									function(error, result){
										if(error){
											res.status(400);
											res.json(error);
										}else{
											res.json({activity: activity._id, trackingCode: activity.trackingCode});
										}
									});
								}
							});
						}
					});
				}
	        });
		} else if(req.params.event_code === 'glp_assigned'){
			var teacher = req.headers['x-gleaner-user'];
	        if(!teacher){
	        	res.status(401);
				return res.json({message: 'Unauthorized'});
	        }

	        if(!req.body.groupId){
	        	res.status(400);
				return res.json({message: 'Missing group id'});
	        }

	        if(!req.body.glp){
	        	res.status(400);
				return res.json({message: 'Missing GLP object'});
	        }

			glpHandler.assigned(req.body, req.body.groupId, teacher, req.app.config, req.app.esClient, function(error, result){
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

	        if(!checkParticipantsObject(req.body.students, res)){
				return;
	        }

			userHandler.createGroup(req.body, teacher, req.app.config, function(error, result){
				if(error){
					res.status(400);
					res.json(error);
				}else{
					res.json({message: 'Success.'});
				}
			});
		} else if(req.params.event_code === 'room_participants_added'){

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

	        if(!checkParticipantsObject(req.body.participants.students, res) || !checkParticipantsObject(req.body.participants.teachers, res)){
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
		} else if(req.params.event_code === 'room_participants_removed'){

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

	        if(!checkParticipantsObject(req.body.participants.students, res) || !checkParticipantsObject(req.body.participants.teachers, res)){
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
		} else if(req.params.event_code === 'room_removed'){

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