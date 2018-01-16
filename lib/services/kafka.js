'use strict';

var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    HighLevelProducer = kafka.HighLevelProducer;


var kafkaService = function (clientUri, callback) {
    var cl;
    var pr;
    var co;

    var kafkaservice = this;

    var client = function () {
        if (!cl) {
            cl = new kafka.Client(clientUri);

            cl.on('ready', function () {
                console.log('Client ready');
            });
        }
        return cl;
    };

    var producer = function () {
        if (!pr) {
            pr = new HighLevelProducer(client());

            pr.on('ready', function () {
                console.log('Producer ready');
                callback(null);
            });

            pr.on('error', function (err) {
                console.log('Producer error', err);
                callback(true);
            });
        }

        return pr;
    };

    producer();

    return {
        client: client,
        send: function (topic, data, callback) {
            producer().send([{topic: topic, messages: data}], callback);
        },
        createTopic: function (topicName, callback) {
            producer().createTopics([topicName.toString()], true, callback);
        }
    };
};

module.exports = kafkaService;