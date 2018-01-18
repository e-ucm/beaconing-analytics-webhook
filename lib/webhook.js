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

class Webhook{

	constructor(db, data){
		this.db = db;
		this.set(data);
	}

	set(data){
		if(data._id) 			this._id = data._id;
		if(data.name) 			this.name = data.name;
		if(data.payload_url) 	this.payload_url = data.payload_url;
		if(data.content_type) 	this.content_type = data.content_type;
		if(data.secret) 		this.secret = data.secret;
		if(data.active) 		this.active = data.active;
	}

	load(callback){
		var data = {};

		this.loaded = false;
		var s = this;
		async.waterfall([
			getWebhook(s.db,s._id,data)
		], function (err, result) {
			if(err) err = "Webhook: Error loading " + s._id + ": " + result
			else s.set(data);

			callback(err,s);
		});
	}

	save(callback){
		var collection = this.db.get('webhooks');
		var s = this;

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
	}

	delete(callback){
		var collection = this.db.get('webhooks');
		var s = this;

		collection.remove({
			"_id": s._id
		},function(e,docs) {
			callback(e)
		});
	}

	check(callback){
		errors = [];
		if(this.name == ""){
			errors.push("Webhook needs a name");
		}

		if(this.payload_url == ""){
			errors.push("Webhook needs a payload url");
		}else if(ValidURL(this.payload_url)){
			this.options = {};
	        this.options.url = webhooks[i].payload_url;
	        this.options.method = "POST";
	        this.options.body = JSON.stringify({message: 'ping'});
	        this.options.headers = {
	        	'Content-Type': 'application/json'
	        }
	    
	        request(this.options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					callback(errors.length === 0 ? null : errors);
				}else
					errors.push('Unable to ping-pong correctly');
					callback(errors);
				}
	        });
		}else{
			errors.push("Invalid Payload URL");
			callback(errors);
		}
	}
}

function ValidURL(str) {
  var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
    '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
    '((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
    '(\:\d+)?(\/[-a-z\d%_.~+]*)*'+ // port and path
    '(\?[;&a-z\d%_.~+=-]*)?'+ // query string
    '(\#[-a-z\d_]*)?$','i'); // fragment locater
  if(!pattern.test(str)) {
    alert("Please enter a valid URL.");
    return false;
  } else {
    return true;
  }
}

function listWebhooks(db, params, webhooks){
	return function(callback){
		var collection = db.get('webhooks');
		collection.find(params, function(err,docs) {
			if (err) callback(true, "ListWebhooks-> Error finding in DB.");
			else {
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

function getWebhook(db, id, webhook){
	return function(callback){
		var collection = db.get('webhooks');
		collection.find({"_id": id}, function(err,docs) {
			if (err) console.log("getSurvey-> Error finding in DB.");
			else {
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


module.exports = {
	listWebhooks: listWebhooks,
	getWebhook: getWebhook,
	Webhook
}
