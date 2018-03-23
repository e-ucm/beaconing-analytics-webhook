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

module.exports = (function () {

    var userHandler = {};
    var headers = [];

    userHandler.create = function(user, config, callback){
        console.log('userHandler.create: started');
        var email = user.id + user.username + '@beaconing.eu';

        var a2user = {
            username: user.username,
            email: email,
            password: email,
            roles: user.roles,
            prefix: 'gleaner',
            externalId: [{ domain: 'beaconing', id: user.id.toString() }]
        }

        request({
            uri: config.a2.a2ApiPath + 'signup',
            method: 'POST',
            body: a2user,
            json: true
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.create: error');
                return callback({message: 'Error creating user, username already exists.'});
            }

            console.log('userHandler.create: success');
            callback(null, body);
        });
    };

    userHandler.createGroup = function(classe, teacher, config, callback){
        console.log('userHandler.createGroup: started');

        userHandler.getClass(classe.id, teacher, config, function(error, result){
            if(!error || result){
                return callback({message: 'Group already exists.'});
            }

            userHandler.transformParticipants({students: classe.students}, config, function(error, participants){
                if(error){
                    return callback({message: 'One or more students does not exist', error: error});
                }

                userHandler.createClass(classe.name, teacher, config, function(error, backendClass){
                    if(error){
                        return callback(error);
                    }

                     console.log('userHandler.createGroup: created backendClass ' + backendClass._id);

                    userHandler.putExternalId(classe.id, backendClass._id, teacher, config, function(error, result){

                        if(error){
                            return callback(error);
                        }

                        userHandler.addParticipants(classe.id, participants, teacher, config, function(error, result){
                            if(error){
                                return callback(error);
                            }

                            callback(null, {message: 'Success.'});
                        });
                    });
                });
            });
        });
    };

    userHandler.createClass = function(name, teacher, config, callback){
        console.log('userHandler.createGroup: started');
        request({
            uri: config.backendUrl + 'api/classes',
            method: 'POST',
            body: {
                name: name
            },
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.createGroup: error');
                return callback({message: 'Error creating group.'});
            }

            console.log('userHandler.createGroup: success');
            callback(null, body);
        });
    };

    userHandler.putExternalId = function(id, backendid, teacher, config, callback){
        console.log('userHandler.putExternalId: started');

        request({
            uri: config.backendUrl + 'api/classes/' + backendid,
            method: 'PUT',
            body: {
                externalId: [{domain: 'beaconing', id: id.toString() }]
            },
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.putExternalId: error');
                console.log(err);
                console.log(body);
                return callback({message: 'Error putting externalId'});
            }

            console.log('userHandler.putExternalId: success');
            callback(null, body);
        });
    };

    userHandler.transformParticipants = function(participants, config, callback){
        console.log('userHandler.transformParticipants: started');
        var transfomed = {
            teachers: [],
            students: []
        };

        var total = 0, completed = 0;
        var participantCompleted = function(type){
            return function(error, result){
                completed++;

                console.log('Transformed participants '  + completed + '/' + total);
                if (type === 'teacher') {
                    transfomed.teachers.push(result.username);
                } else {
                    transfomed.students.push(result.username);
                }

                if(completed >= total){
                    console.log('userHandler.transformParticipants: Success!');
                    callback(null, transfomed);
                }
            };
        };

        if(participants.teachers || participants.students){
            userHandler.auth(config, function(error, result){
                if(participants.teachers){
                    total += participants.teachers.length;
                    for(var i = 0; i < participants.teachers.length; i++){
                        userHandler.getUser(participants.teachers[i], config, participantCompleted('teacher'));
                    }
                }

                if(participants.students){
                    total += participants.students.length;
                    for(var i = 0; i < participants.students.length; i++){
                        userHandler.getUser(participants.students[i], config, participantCompleted('student'));
                    }
                }
            });
        }

        if(total == 0){
            console.log('userHandler.transformParticipants: Nothing transfomed!');
            callback(null, transfomed);
        }
    };

    userHandler.addParticipants = function(id, participants, teacher, config, callback){
        console.log('userHandler.addParticipants: started');

        request({
            uri: config.backendUrl + 'api/classes/external/beaconing/' + id,
            method: 'PUT',
            body: {
                participants: participants
            },
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.addParticipants: error');
                return callback(body);
            }

            console.log('userHandler.addParticipants: success');
            callback(null, body);
        });
    };

    userHandler.getClass = function(id, teacher, config, callback){
        request({
            uri: config.backendUrl + 'api/classes/external/beaconing/' + id,
            method: 'get',
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.getClass: error');
                return callback(body);
            }

            console.log('userHandler.getClass: success');
            callback(null, body);
        });
    };

    userHandler.getUser = function(id, config, callback){
        console.log('userHandler.getUser: started');

        var getuser = function(cb){
            var email = user.id + user.username + '@beaconing.eu';

            request({
                uri: config.a2.a2ApiPath + 'users/external/beaconing/' + id,
                method: 'GET',
                json: true,
                headers: headers
            }, function (err, httpResponse, body) {
                if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                    console.log('userHandler.getUser: error');
                    return cb(body);
                }

                console.log('userHandler.getUser: success');
                cb(null, body);
            });
        };

        if(!headers.Authorization){
            userHandler.auth(config, function(error, result){
                getuser(callback)
            });
        }else{
            getuser(callback)
        }
    };

    userHandler.auth = function(config, callback){
        console.log('userHandler.auth: started');
        request({
            uri: config.a2.a2ApiPath + 'login',
            method: 'POST',
            body: { username: config.a2.a2AdminUsername, password: config.a2.a2AdminPassword },
            json: true,
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.auth: error');
                return callback(body);
            }

            headers.Authorization = 'Bearer ' + body.user.token;

            console.log('userHandler.auth: success');
            callback(null, body.user.token);
        });
    };

    return userHandler;
})();