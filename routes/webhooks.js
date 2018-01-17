module.exports = function(auth, getBasePath){

	var express = require('express'),
    router = express.Router();

	var request = require('request');
	var async = require('async');

	var webhookLib = require('../lib/webhook.js');

	router.get('/', auth(1), function(req, res, next){
		var webhooks = [];
		var db = req.db;

		async.waterfall([
			webhookLib.listWebhooks(db, {}, webhooks),
		], function (err, result) {
			res.render('webhook_list', {basePath: getBasePath(req), webhooks: webhooks});
		});
	});

	router.post('/', auth(1), function(req, res, next) {
		var webhook = new webhookLib.Webhook(req.db, req.body);

		webhook.save(function(err,result){
			res.redirect('webhooks');
		});
	});

	router.get('/delete/:webhook_id', auth(2), function(req, res, next) {
		var webhook = new webhookLib.Webhook(req.db, {_id: req.params.webhook_id});

		webhook.load(function(err, result){
			if(err)
				return next(new Error(err));

			webhook.delete(function(err,result){
				if(err)
					return next(new Error(err));

				res.redirect('../../webhooks');
			});
		});
	});

	return router;
}
