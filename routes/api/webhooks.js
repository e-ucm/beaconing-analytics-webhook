module.exports = function(auth){

	var express = require('express'),
    router = express.Router();

	var request = require('request');
	var async = require('async');

	var webhookLib = require('../../lib/webhook.js');

	/**
	 * @api {get} /api/webhooks/ Returns a list of webhooks
	 * @apiName listWebhooks
	 * @apiGroup Webhooks
	 *
	 * @apiSuccess(200) Success
	 */
	router.get('/', auth(2), function(req, res, next){
		var webhooks = [];
		var db = req.db;

		async.waterfall([
			webhookLib.listWebhooks(db, {}, webhooks),
		], function (err, result) {
			if(err)
				return next(new Error(err));

			res.send(webhooks);
		});
	});

	/**
	 * @api {get} /api/webhooks/:id Returns the requested webhook
	 * @apiName getWebhook
	 * @apiGroup Webhooks
	 * 
	 * @apiParam {string} id The webhook id
	 *
	 * @apiSuccess(200) Success
	 */
	router.get('/:id', auth(2), function(req, res, next){
		var webhook = new webhookLib.Webhook(req.db, {_id: req.params.id});

		webhook.load(function(err, result){
			if(err)
				return next(new Error(err));

			res.send(webhook);
		});
	});

	/**
	 * @api {post} /api/webhooks/ Creates a webhook
	 * @apiName postWebhook
	 * @apiGroup Webhooks
	 * 
	 * @apiParam {string} [name] A name for the webhook
	 * @apiParam {string} [payload_url] The url where the webhook will notify
	 * @apiParam {string} [content_type] What type of content is the webhook expecting to receive (application/json)
	 * @apiParam {string} [secret] Secret between sender and receiver to secure the connection
	 * @apiParam {bool} [active=true] If active, the webhook will be notified
	 *
	 * @apiSuccess(200) Success
	 * @return {webhook} The saved webhook
	 */
	router.post('/', auth(2), function(req, res, next) {
		var webhook = new webhookLib.Webhook(req.db, req.body);

		webhook.save(function(err,result){
			if(err)
				return next(new Error(err));

			res.send(webhook.toObject());
		});
	});

	/**
	 * @api {put} /api/webhooks/ Creates a webhook
	 * @apiName putWebhook
	 * @apiGroup Webhooks
	 *
	 * @apiParam {string} id The webhook id
	 * @apiParam {string} [name] A name for the webhook
	 * @apiParam {string} [payload_url] The url where the webhook will notify
	 * @apiParam {string} [content_type] What type of content is the webhook expecting to receive (application/json)
	 * @apiParam {string} [secret] Secret between sender and receiver to secure the connection
	 * @apiParam {bool} [active=true] If active, the webhook will be notified
	 *
	 * @apiSuccess(200) Success
	 */
	router.put('/:id', auth(2), function(req, res, next) {
		var webhook = new webhookLib.Webhook(req.db, {_id: req.params.id});

		webhook.load(function(err, result){
			if(err)
				return next(new Error(err));

			webhook.set(req.body);

			webhook.save(function(err,result){
				if(err)
					return next(new Error(err));

				res.send(webhook.toObject());
			});
		});
	});

	/**
     * @api {delete} /webhooks/:id Deletes a webhook
     * @apiName deleteWebhook
     * @apiGroup Webhooks
     *
     * @apiParam {String} id The id of the webhook.
     *
     * @apiSuccess(200) Success.
     *
     * @apiSuccessExample Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *         "message": "Success."
     *      }
     */
	router.delete('/:id', auth(2), function(req, res, next) {
		var webhook = new webhookLib.Webhook(req.db, {_id: req.params.id});

		webhook.load(function(err, result){
			if(err)
				return next(new Error(err));

			webhook.delete(function(err,result){
				if(err)
					return next(new Error(err));

				res.send({message: 'Success.'});
			});
		});
	});

	return router;
}
