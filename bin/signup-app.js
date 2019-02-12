/*
 * Copyright 2016 e-UCM (http://www.e-ucm.es/)
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

'use strict';

/**
 * This file issues the needed requests to set up the Webhook application
 * with the roles defined in the 'a-webhook-routes.js' file.
 *
 */

var Path = require('path');
var request = require('request');
var config = require(Path.resolve(__dirname, '../config.js'));
var appData = require(Path.resolve(__dirname, './a-webhook-routes.js')).app;

var baseUsersAPI = config.a2.a2ApiPath;

request.post(baseUsersAPI + 'login', {
        form: {
            username: config.a2.a2AdminUsername,
            password: config.a2.a2AdminPassword
        },
        json: true
    },
    function (err, httpResponse, body) {
        if (err) {
            if (err.errno && err.errno.indexOf('ECONNREFUSED') > -1) {
                return CheckConfigAndContinue(-1, {
                    error: err,
                    message: 'Could not connect to A2 to login!'
                });
            }
            return CheckConfigAndContinue(0, {
                error: err,
                message: 'Did not register the Webhook with A2!'
            });
        }

        appData.name = config.projectName;
        appData.prefix =  config.a2.a2Prefix;
        appData.host = 'http://' + config.myHost + ':' + config.port;

        request({
            uri: baseUsersAPI + 'applications',
            method: 'POST',
            body: appData,
            json: true,
            headers: {
                Authorization: 'Bearer ' + body.user.token
            }
        }, function (err, httpResponse, body) {
            if (err) {
                console.error(err);
                if (err.errno && err.errno.indexOf('ECONNREFUSED') > -1) {
                    return CheckConfigAndContinue(-1, {
                        error: err,
                        message: 'Could not connect to A2 to register the Webhook application!'
                    });
                }
                return CheckConfigAndContinue(0, {
                    error: err,
                    message: 'Did not register the Webhook with A2!'
                });
            }

            if (body.message) {
                return CheckConfigAndContinue(0, {
                    error: body.message,
                    message: 'Did not register the Webhook with A2!'
                });
            } else {
                console.log('Application and roles setup complete.');
            }

            process.exit(0);
        });
    });

/**
 * If A2 connection is required and an error is present, this function exits the application.
 * @param {int}    code  The error code
 * @param {object} error An object with a detailed explanation of the error, if so.
 */
var CheckConfigAndContinue = function(code, error){
    if(error){
        console.info(error);

        if(config.a2Active){
            console.log("Webhook requires A2, exiting!");
            return process.exit(1);
        }
    }

    console.log("Does not require A2, continuing anyway!");
    return process.exit(code);
}