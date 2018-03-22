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
            json: true,
            headers: headers
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.create: error');
                return callback({message: 'Error creating user, username already exists.'});
            }

            console.log('userHandler.create: success');
            callback(null, body);
        });
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