/*
 * Copyright 2017 e-UCM (http://www.e-ucm.es/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * This project has received funding from the European Union’s Horizon
 * 2020 research and innovation programme under grant agreement No 644187.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0 (link is external)
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
var request = require('request');
var async = require('async');

/**
 * Class Webhook is a business object to manage webhook DB transparently
 */
class Webhook{

	/**
	 * Creating a webhook requires to pass the DB and optionally can pass the data
	 * @param  {mongogb} db   The db object
	 * @param  {object} data  Object with params that will be assigned to the webhook
	 * @return {webhook}      the webhook
	 */
	constructor(db, data){
		this.loaded = false;
		this.db = db;
		this.set(data);
	}

	/**
	 * Allows to set up the webhook
	 * @param {object} data Object with params that will be assigned to this webhook
	 */
	set(data){
		if(data._id) 			this._id = data._id;
		if(data.name) 			this.name = data.name;
		if(data.payload_url) 	this.payload_url = data.payload_url;
		if(data.content_type) 	this.content_type = data.content_type;
		if(data.secret) 		this.secret = data.secret;
		if(data.active) 		this.active = data.active;
	}

	/**
	 * Load and sets the data of the object based on the setted ID
	 * @param  {Function} callback The callback function to be called
	 * @return {webhook}           The loaded webhook and error if failed
	 */
	load(callback){
		var data = {};

		var s = this;
		async.waterfall([
			getWebhook(s.db,s._id,data)
		], function (err, result) {
			if(err) err = "Webhook: Error loading " + s._id + ": " + result
			else s.set(data);

			this.loaded = true;
			callback(err,s);
		});
	}

	/**
	 * Saves the webhook object based on the setted data
	 * @param  {Function} callback The callback function to be called
	 * @return {webhook}           The saved webhook and error if failed
	 */
	save(callback){
		var collection = this.db.get('webhooks');
		var s = this;

		this.check(function(e, r){
			if(e && e.length > 0){
				callback(e, r);
				return;
			}

			if(!this._id){ //NEW INSERTION
				var attrs = {
					"name": s.name,
					"payload_url" : s.payload_url,
					"content_type" : s.content_type,
					"secret" : s.secret,
					"active": s.active
				}

				collection.insert(attrs,function(e,docs) {
					if(!e)
						s.set(docs);

					callback(e,s)
				});
			}else{ //UPDATE
				var aux = new Webhook(this.db, {_id: this._id});
				aux.load(function(err,result){
					var attrs = {};

					if(s.name && s.name !== aux.name) 							attrs['name'] = s.name;
					if(s.payload_url && s.payload_url !== aux.payload_url) 		attrs['payload_url'] = s.payload_url;
					if(s.content_type && s.content_type !== aux.content_type) 	attrs['content_type'] = s.content_type;
					if(s.secret && s.secret !== aux.secret) 					attrs['secret'] = s.secret;
					if(s.active && s.active !== aux.active) 					attrs['active'] = s.active;

					collection.findOneAndUpdate(
						{"_id": s._id}, // query
						{$set: attrs},
						function(err, docs) {
							if(!err)
								s.set(docs);

							callback(err, s);
						}
					);
				});
			}
		});
	}

	/**
	 * Deletes the webhook document in the DB with the setted ID
	 * @param  {Function} callback The callback function to be called at the end
	 * @return {error}             Returns error if failed
	 */
	delete(callback){
		var collection = this.db.get('webhooks');
		var s = this;

		collection.remove({
			"_id": s._id
		},function(e,docs) {
			callback(e)
		});
	}

	/**
	 * Check if the attributes of the webhook are valid, usefull before saving the object
	 * @param  {Function} callback Callback function to be called when everything is checked
	 * @return {Array}             The lists of errors that the webhook contains
	 */
	check(callback){
		var errors = [];
		if(this.name == ""){
			errors.push("Webhook needs a name");
		}

		// Check the Url
		var ping_url = false;
		if(this.payload_url == ""){
			errors.push("Webhook needs a payload url");
		}else if(!ValidURL(this.payload_url)){
			errors.push("Invalid Payload URL");
		}else{
			ping_url = true;
		}

		// Pings the url to ensure is a valid endpoint
		if(ping_url){
			this.options = {};
	        this.options.url = this.payload_url;
	        this.options.method = "POST";
	        this.options.body = JSON.stringify({message: 'ping'});
	        this.options.headers = {
	        	'Content-Type': 'application/json'
	        }
	    
	        request(this.options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					callback(errors.length === 0 ? null : errors);
				}else{
					errors.push('Unable to ping-pong correctly');
					callback(errors);
				}
	        });
	    }else{
	    	callback(errors);
	    }
	}

	/**
	 * Returns the webhook if object format, useful for foreach-like data extraction
	 * @return {object} The webhook in object format (without functions)
	 */
	toObject(){
		return { _id: _id, name: name, payload_url: payload_url, content_type: content_type, secret: secret, active: active };
	}
}

/**
 * Determines if an URL is a valid url
 * @param {bool} true if is a valid url, false if not
 */
function ValidURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return pattern.test(str);
}

/**
 * Search and return the list of webhooks based in the params.
 * @param  {mongodb} db      The mongo database
 * @param  {object} params   Mongo Query parameters to be passed to the DB
 * @param  {object} webhooks Object where the searched webhooks will be returned
 * @return {error}           The errors if so. Output is in webhooks variable
 */
function listWebhooks(db, params, webhooks){
	return function(callback){
		var collection = db.get('webhooks');
		collection.find(params, function(err,docs) {
			if (err) {
				callback({ message: "ListWebhooks-> Error finding in DB.", error: err });
			} else {
				if(docs)
					for (var i=0; i < docs.length; i++) {
						var webhook = {};
						webhook._id = docs[i]._id;
						webhook.name = docs[i].name;
						webhook.payload_url = docs[i].payload_url;
						webhook.content_type = docs[i].content_type;
						webhook.secret = docs[i].secret;
						webhook.active = docs[i].active;
						webhooks.push(new Webhook(this.db, webhook));
					}

				callback(null);
			}
		});
	}
}

/**
 * Adds the webhook attributes to the webhook parameter
 * @param  {mongodb} db     The mongo database
 * @param  {string} id      The id of the webhook to be requested
 * @param  {object} webhook The object where the data will be added
 * @return {error}          The error if there is error.
 */
function getWebhook(db, id, webhook){
	return function(callback){
		var collection = db.get('webhooks');
		collection.find({"_id": id}, function(err,docs) {
			if (err) {
				callback({ message: "getWebhook-> Error finding in DB.", error: err });
			} else {
				webhook._id = docs[0]._id;
				webhook.user = docs[0].user;
				webhook.name = docs[0].name;
				webhook.pre = docs[0].pre;
				webhook.post = docs[0].post;
				webhook.teacher = docs[0].teacher;
				webhook.classrooms = docs[0].classrooms;
			}
			callback(null);
		});
	}
}

// We export the two functions used to get either the webhook list and an individual webhook.
// Also we export the class Webhook itself.
module.exports = {
	listWebhooks: listWebhooks,
	getWebhook: getWebhook,
	Webhook
}
