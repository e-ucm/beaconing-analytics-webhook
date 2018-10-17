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

/**
 * Class EventType is an business object to manage the Event db transparently
 */
class EventType{

	/**
	 * Creating a EventType requires the DB and optionally can pass the data
	 * @param  {mongodb} db  The DB object
	 * @param  {object} data Object with params that will be assigned to the webhook
	 * @return {eventtype}   The eventtype created
	 */
	constructor(db, data){
		this.db = db;
		this.set(data);
	}

	/**
	 * Allows to set up the Event Type based on the given data
	 * @param {object} data Object with params that will be assigned to this EventType
	 */
	set(data){
		if(!data){
			return;
		}

		if(data._id) 			this._id = data._id;
		if(data.name) 			this.name = data.name;
		if(data.code) 			this.code = data.code;
		if(data.description) 	this.description = data.description;
	}

	/**
	 * Loads and sets the data of the object based on the setted ID
	 * @param  {Function} callback The callback function to be called when everything is completed
	 * @return {eventtype}         The loaded Event Type or error if failed
	 */
	load(callback){
		var collection = this.db.get('eventtypes');

		this.loaded = false;
		var s = this;

		var params = {};
		if(this._id){
			params._id = this._id;
		}else if(this.code){
			params.code = this.code;
		}

		collection.find(params, function(err,docs) {
			if (err || docs.length === 0) {
				console.log("getEventType-> Error finding in DB.");
				callback(true, s);
			} else {
				s.set(docs[0]);
				callback(err, s);
			}
		});
	}

	/**
	 * Saves the event type object based on the setted data
	 * @param  {Function} callback The callback function to be called when everything is completed
	 * @return {eventtype}	       The saved event type
	 */
	save(callback){
		var collection = this.db.get('eventtypes');
		var s = this;

		if(!this._id){ //NEW INSERTION
			var attrs = {
				"name": s.name,
				"code": s.code,
				"description" : s.description
			}

			collection.insert(attrs,function(e,docs) {
				if(!e)
					s.set(docs);

				callback(e,s)
			});
		}else{ //UPDATE
			var aux = new EventType(this.db, {_id: this._id});
			aux.load(function(err,result){
				var attrs = {};

				if(s.name && s.name !== aux.name) 							attrs['name'] = s.name;
				if(s.code && s.code !== aux.code) 							attrs['code'] = s.code;
				if(s.description && s.description !== aux.description) 		attrs['description'] = s.description;

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

	/**
	 * Deletes de Event Type document in the DB with the setted ID
	 * @param  {Function} callback Callbackfunction to be called when everything is completed
	 * @return {object}            Null or error if happened.
	 */
	delete(callback){
		var collection = this.db.get('eventtypes');
		var s = this;

		collection.remove({
			"_id": s._id
		},function(e,docs) {
			callback(e)
		});
	}
}

/**
 * Determines if an URL is a valid URL
 * @param  {mongodb} db         The mongo database
 * @param  {object} params     Mongo Query Parameters to be passed to the DB
 * @param  {object} eventtypes Object where the searched event types will be returned
 * @return {object}            Null or error. Output is in eventtypes parameter.
 */
function listEventTypes(db, params, eventtypes){
	return function(callback){
		var collection = db.get('eventtypes');
		collection.find(params, function(err,docs) {
			if (err) callback(true, "ListEventTypes-> Error finding in DB.");
			else {
				if(docs)
					for (var i=0; i < docs.length; i++) {
						var eventtype = {};
						eventtype._id = docs[i]._id;
						eventtype.name = docs[i].name;
						eventtype.code = docs[i].code;
						eventtype.description = docs[i].description;
						eventtypes.push(eventtype);
					}

				callback(null);
			}
		});
	}
}

/**
 * Gets the event type with the ID from the db and sets to the eventype parameter
 * @param  {mongodb} db        The mongo database
 * @param  {string} id        The Mongo ID of the object to be retrieved
 * @param  {object} eventtype Object where the data will be setted
 * @return {object}           Null or error. Output is in eventtype parameter.
 */
function getEventType(db, id, eventtype){
	return function(callback){
		var collection = db.get('eventtypes');
		collection.find({"_id": id}, function(err,docs) {
			if (err) console.log("getEventTypes-> Error finding in DB.");
			else {
				eventtype._id = docs[0]._id;
				eventtype.name = docs[0].name;
				eventtype.code = docs[0].code;
				eventtype.description = docs[0].description;
			}
			callback(null);
		});
	}
}

// We export the two functions used to get either the EventTypes list and an individual EventType.
// Also we export the class EventType itself.
module.exports = {
	listEventTypes: listEventTypes,
	getEventTypes: getEventType,
	EventType
}
