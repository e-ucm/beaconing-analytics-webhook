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

    /**
     * Creates a user into A2 with an FormalZ email and its
     * @param  {object}   user     The user parameters
     * @param  {object}   config   Configuration of the webhook
     * @param  {function} callback The callback function to be called when everything is completed
     * @return {object}            The created user or error if failed
     */
    userHandler.create = function(user, config, callback){
        console.log('userHandler.create: started');
        var email = user.id + user.username + '@formalz.test';

        var a2user = {
            username: user.username,
            email: email,
            password: email,
            role: user.role,
            prefix: 'gleaner',
            externalId: [{ domain: 'formalz', id: user.id.toString() }]
        }

        console.log('Creating: ' + JSON.stringify(a2user));

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

    /**
     * Creates a class into A2, sets up an externalId for it, and adds its participants.
     * @param  {object}   classe   The group object from FormalZ Core
     * @param  {string}   teacher  Username of the Teacher to create the group for
     * @param  {object}   config   Configuration of the webhook
     * @param  {function} callback The callback function to be called when everything is completed
     * @return {object}            Success or error if happened
     */
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

                            callback(null, backendClass);
                        });
                    });
                });
            });
        });
    };

    /**
     * Deletes a group with a FormalZ group ID as the one given.
     * @param  {string}   id       The External FormalZ ID of the group to be deleted
     * @param  {string}   teacher  Username of the Teacher who owns the group
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed.
     * @return {object}            Success or error if happened.
     */
    userHandler.removeGroup = function(id, teacher, config, callback){
        console.log('userHandler.removeGroup: started');
        request({
            uri: config.backendUrl + 'api/classes/external/formalz/' + id,
            method: 'DELETE',
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log('userHandler.removeGroup: error');
                return callback({message: 'Error deleting group.', error: body});
            }

            console.log('userHandler.removeGroup: success');
            callback(null, body);
        });
    };

   /**
    * Receives a list of FormalZ External IDs of participants and adds them to a class
    * @param  {object}   classe   Object that contains 2 optional sublists of students and teachers
    * @param  {string}   teacher  Username of the teacher who owns the group
    * @param  {object}   config   Configuration of the webhook
    * @param  {Function} callback Callback function to be called when everything is completed
    * @return {object}            Success or error if happened
    */
    userHandler.transformAndAddParticipans = function(classe, teacher, config, callback){
        userHandler.getClass(classe.id, teacher, config, function(error, result){
            if(error){
                return callback({message: 'Group not exist.', error: error});
            }

            userHandler.transformParticipants(classe.participants, config, function(error, participants){
                if(error){
                    return callback({message: 'One or more students does not exist', error: error});
                }
                userHandler.addParticipants(classe.id, participants, teacher, config, function(error, result){
                    if(error){
                        return callback(error);
                    }

                    callback(null, {message: 'Success.'});
                });
            });
        });
    };

    /**
     * Receives a list of FormalZ External IDs of participants and removes them from a class
     * @param  {object}   classe   Object that contains 2 optional sublists of students and teachers
     * @param  {string}   teacher  Username of the teacher who owns the group
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed
     * @return {object}            Success or error if happened.
     */
    userHandler.transformAndRemoveParticipans = function(classe, teacher, config, callback){
        userHandler.getClass(classe.id, teacher, config, function(error, result){
            if(error){
                return callback({message: 'Group not exist.', error: error});
            }

            userHandler.transformParticipants(classe.participants, config, function(error, participants){
                if(error){
                    return callback({message: 'One or more students does not exist', error: error});
                }
                userHandler.removeParticipants(classe.id, participants, teacher, config, function(error, result){
                    if(error){
                        return callback(error);
                    }

                    callback(null, {message: 'Success.'});
                });
            });
        });
    }

    /**
     * Internal method for creating a class in RAGE Analytics backend.
     * @param  {string}   name     Name of the class
     * @param  {string}   teacher  Username of the teacher who will own the class
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed
     * @return {object}            Created class object or error if happened.
     */
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

    /**
     * Puts an External ID into an existing class into backend.
     * @param  {string}   id        External ID of the class to be added.
     * @param  {string}   backendid ID of the class in backend
     * @param  {string}   teacher   Username of the teacher owner of the class
     * @param  {object}   config    Configuration of the webhook
     * @param  {Function} callback  Callback function to be called when everything is completed.
     * @return {object}             Success or error if happened.
     */
    userHandler.putExternalId = function(id, backendid, teacher, config, callback){
        console.log('userHandler.putExternalId: started');

        request({
            uri: config.backendUrl + 'api/classes/' + backendid,
            method: 'PUT',
            body: {
                externalId: [{domain: 'formalz', id: id.toString() }]
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

    /**
     * Transforms a list of FormalZ IDs into a list of Backend usernames of the students
     * @param  {object}   participants List of participants (students and teachers) to be transformed
     * @param  {object}   config       Configuration of the webhook
     * @param  {Function} callback     Callback function to be called when everything is completed
     * @return {object}                An object with the lists of transformed participants
     */
    userHandler.transformParticipants = function(participants, config, callback){
        console.log('userHandler.transformParticipants: started');
        var transfomed = {
            teachers: [],
            students: []
        };

        var total = -1, completed = 0;
        var failed = false;
        var participantCompleted = function(type){
            return function(error, result){
                if(failed){
                    return;
                }
                if(error){
                    failed = true;
                    return callback({message: 'User not found.', error: error});
                }
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

        if((participants.teachers && participants.teachers.length > 0) || (participants.students && participants.students.length > 0)){
            total = 0;
            userHandler.auth(config, function(error, result){
                if(participants.teachers && participants.teachers.length > 0){
                    total += participants.teachers.length;
                    for(var i = 0; i < participants.teachers.length; i++){
                        userHandler.getUser(participants.teachers[i], config, participantCompleted('teacher'));
                    }
                }

                if(participants.students && participants.students.length > 0){
                    total += participants.students.length;
                    for(var i = 0; i < participants.students.length; i++){
                        userHandler.getUser(participants.students[i], config, participantCompleted('student'));
                    }
                }
            });
        }

        if(total == -1){
            console.log('userHandler.transformParticipants: Nothing transfomed!');
            callback(null, transfomed);
        }
    };

    /**
     * Adds the already transformed participants to a class.
     * @param  {string}   id           FormalZ External ID of the class.
     * @param  {object}   participants The list of participants to be added to the class.
     * @param  {string}   teacher      Username of the teacher owner of the class.
     * @param  {object}   config       Configuration of the webhook.
     * @param  {Function} callback     Callback function to be called when everything is completed.
     * @return {object}                Success or error if happened.
     */
    userHandler.addParticipants = function(id, participants, teacher, config, callback){
        console.log('userHandler.addParticipants: started');

        request({
            uri: config.backendUrl + 'api/classes/external/formalz/' + id,
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

    /**
     * Removes the already transformed participants from the class.
     * @param  {string}   id           FormalZ External ID of the class.
     * @param  {object}   participants The list of participants to be removed from the class.
     * @param  {string}   teacher      Username of the teacher who owns the class.
     * @param  {object}   config       Configuration of the webhook.
     * @param  {Function} callback     Callback function to be called when everything is completed.
     * @return {object}                Success or error if happened.
     */
    userHandler.removeParticipants = function(id, participants, teacher, config, callback){
        console.log('userHandler.removeParticipants: started');

        request({
            uri: config.backendUrl + 'api/classes/external/formalz/' + id + '/remove',
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
                console.log('userHandler.removeParticipants: error');
                return callback(body);
            }

            console.log('userHandler.removeParticipants: success');
            callback(null, body);
        });
    };

    /**
     * Obtains the class object from an external FormalZ ID of the group
     * @param  {string}   id       FormalZ External ID of the class
     * @param  {string}   teacher  Username of the teacher who owns the class
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed
     * @return {object}            The class object or error if happened
     */
    userHandler.getClass = function(id, teacher, config, callback){
        request({
            uri: config.backendUrl + 'api/classes/external/formalz/' + id,
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

    /**
     * Obtains the user object from an external FormalZ ID of the user
     * @param  {string}   id       FormalZ External ID of the user
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed
     * @return {object}            The user object or error if happened
     */
    userHandler.getUser = function(id, config, callback){
        console.log('userHandler.getUser: started');

        /**
         * Does the request to obtain the user
         * @param  {Function} cb Callback function to be called when everything is completed
         * @return {object}      The user object
         */
        var getuser = function(cb){
            request({
                uri: config.a2.a2ApiPath + 'users/external/formalz/' + id,
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

        // If the request hasn't been authoriced, first auth the request
        if(!headers.Authorization){
            userHandler.auth(config, function(error, result){
                getuser(callback)
            });
        }else{
            getuser(callback)
        }
    };

    userHandler.getRoles = function(username, config, callback){
        userHandler.getUsersInternal('{"username":"' + username + '"}', config, function(error, result){
            if(error){
                return callback(error);
            }else if(!result || !result.data || result.data.length == 0){
                return callback({error: 'User not found'});
            }

            userHandler.requestRoles(result.data[0]._id, config, function(error, result){
                return callback(error, result);
            });
        });
    };

    /**
     * Obtains the users using a query
     * @param  {string}   query    Filter query
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed
     * @return {object}            The user object or error if happened
     */
    userHandler.getUsersInternal = function(query, config, callback){
        console.log('userHandler.getUsersInternal: started');

        /**
         * Does the request to obtain the user
         * @param  {Function} cb Callback function to be called when everything is completed
         * @return {object}      The user object
         */
        var getuser = function(cb){
            request({
                uri: config.a2.a2ApiPath + 'users/' + (query ? '?query=' + encodeURI(query) : ''),
                method: 'GET',
                json: true,
                headers: headers
            }, function (err, httpResponse, body) {


                console.info(err, body);

                if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                    console.log('userHandler.getUsersInternal: error');
                    return cb(body);
                }

                console.log('userHandler.getUsersInternal: success');
                cb(null, body);
            });
        };

        // If the request hasn't been authoriced, first auth the request
        if(!headers.Authorization){
            userHandler.auth(config, function(error, result){
                getuser(callback)
            });
        }else{
            getuser(callback)
        }
    };

    /**
     * Obtains the roles of a user
     * @param  {string}   id       Internal id of the user
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is completed
     * @return {object}            The user object or error if happened
     */
    userHandler.requestRoles = function(id, config, callback){
        console.log('userHandler.requestRoles: started');

        /**
         * Does the request to obtain the roles
         * @param  {Function} cb Callback function to be called when everything is completed
         * @return {object}      The roles object
         */
        var getRoles = function(cb){
            request({
                uri: config.a2.a2ApiPath + 'users/' + id + '/roles',
                method: 'GET',
                json: true,
                headers: headers
            }, function (err, httpResponse, body) {


                console.info(err, body);

                if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                    console.log('userHandler.requestRoles: error');
                    return cb(body);
                }

                console.log('userHandler.requestRoles: success');
                cb(null, body);
            });
        };

        // If the request hasn't been authoriced, first auth the request
        if(!headers.Authorization){
            userHandler.auth(config, function(error, result){
                getRoles(callback)
            });
        }else{
            getRoles(callback)
        }
    };

    /**
     * Authenticates into A2 as root user and prepares the headers to use the Bearer auth token
     * @param  {object}   config   Configuration of the webhook
     * @param  {Function} callback Callback function to be called when everything is ready
     * @return {object}            User token or error if happened
     */
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