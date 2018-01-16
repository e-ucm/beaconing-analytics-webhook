'use strict';

var eventTypeLib = require('../eventtype');
var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    Offset = kafka.Offset;

var kafkaService;
var kafkaConfig;
 
var Kafka = function () {
    var kafka_config;
    var kafka_service;

    return {
        Init: function(kafkaConfig, callback){
            kafka_config = kafkaConfig;
            kafka_service = require('../services/kafka')(kafka_config.uri, function(error){
                if(error){
                    console.log("Error on kafka inizialization");
                    callback(true);
                    return;
                }

                kafka_service.createTopic(kafka_config.topicName, function(err, res){
                    if(err){
                        console.info(err);
                        console.log("Error creating kafka topic");
                        callback(true);
                        return;
                    }
                    else{
                        console.log("Kafka running");
                    }

                    callback(null);
                });
            });
        },
        CreateConsumer: function(topic, callback){
            var client = new kafka.Client(kafka_config.uri);

            var offset = new Offset(client);

            offset.fetch([{ topic: kafka_config.topicName, partition: 0, time: -1 }], function (err, data) {
                var latestOffset = data[kafka_config.topicName]['0'][0];
                console.log("Consumer current offset: " + latestOffset);

                var consumer = new Consumer(client, [ { topic: topic, partition: 0, offset: latestOffset } ], { autoCommit: false, fromOffset: true });
                consumer.on('message', callback);
            });
        },
        Send: function(data, callback){
            kafka_service.send(kafka_config.topicName, data, callback);
        }
    };
};

module.exports = Kafka;