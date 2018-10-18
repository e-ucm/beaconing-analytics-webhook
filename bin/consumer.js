/*
 * Copyright 2018 e-UCM (http://www.e-ucm.es/)
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

// Webhook is composed of two node applications, the website (back+front) which entry point is www,
// and the consumer (this file), that is created to listen from kafka about the events that have been
// enqueued. This is made to be able to notify to the webhook listeners without blocking the rest of
// the request of the website.

#!/usr/bin/env node
var request = require('request');
var config = require('../config');
var monk = require('monk');
var db = monk(config.mongodb.uri);
var request = require('request');

db.collection('clients');


// Initialize kafka and topic
var queue = require('../lib/wrappers/kafka')();
console.info(config.kafka);

queue.Init(config.kafka, function(error){
  if(error){
    console.log("Error on kafka Init: " + error);
    return;
  }

  var webhookLib = require('../lib/webhook');
  // This consumer is the responsible of notifying the webhook of the received events. For each event received
  // We look for the webhooks and notify them about the event that has happened. 
  // Every message.value must contain:
  // {
  //    "event": "event_name",
  //    "body": {
  //      "whatever": "the event wants to content"
  //    }
  // }
  queue.CreateConsumer(config.kafka.topicName, function(message){
    var value = JSON.parse(message.value);
    var webhooks = [];

    webhookLib.listWebhooks(db, {}, webhooks)(function(){
      for(var i in webhooks){
        this.options = {};
        this.options.url = webhooks[i].payload_url;
        this.options.method = "POST";
        this.options.body = JSON.stringify(value.body);
        this.options.headers = {
          'Content-Type': 'application/json',
          'X-Analytics-Event': value.event
        }
    
        request(this.options, function(webhook){
          return function(error, response, body){
            if (!error && response.statusCode == 200) {
              console.log("Notified " + webhook.name + "("+webhook.payload_url+") of event " + value.event);
            }else
              console.log("Can't notify " + webhook.name + "("+webhook.payload_url+") of event " + value.event);
          }
        }(webhooks[i]));
      }
    });
  })
});

queue = queue;