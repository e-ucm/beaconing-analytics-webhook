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
var userHandler = require('./userhandler');

/**
 * Replaces all ocurrences of a string in a string
 * @param  {string} search      The string to be searched
 * @param  {string} replacement The string to replace the ocurrences
 * @return {string}             The new string
 */
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

module.exports = (function () {

    var glpHandler = {};

    /**
     * Returns the analytics object for a node. Analytics object is a container for saving the
     * tracking code, the activity ID and other management parameters.
     * @param  {object} node The node where the analytics have to be extracted
     * @return {object}      The Analytics object or null if not found
     */
    var getAnalytics = function(node){
        if(node.analytics){
            if(node.analytics.json && node.analytics.json.analytics){
                return node.analytics.json.analytics
            }else{
                return node.analytics;
            }
        }
        return null;
    }

    /**
     * Returns the challenges of a node if the node has challenges
     * @param  {object} node The node where the challenges will be extracted
     * @return {array}       The list of challenges
     */
    var getChallenges = function(node){
        return get3rdLvlElement(node, 'challenges');
    }

    /**
     * Returns the Location Based Games of a node if the node has LBGs
     * @param  {object} node The node where the LBGs will be extracted
     * @return {array}       the list of LBGs
     */
    var getLocationBasedGames = function(node){
        return get3rdLvlElement(node, 'locationBasedGames');
    }

    /**
     * Sub-function to be used to extract a type of list from a node in various object formats
     * from Beaconing AT updated structures (node.graph, scenes, quest, etc.)
     * @param  {object} node The node where the list will be extracted
     * @param  {string} name The name of the list to look for
     * @return {array}       The list of elements searched or null if not found
     */
    var get3rdLvlElement = function(node, name){
        if(!node.graph){
            return null;
        }else if(node.graph.quest && node.graph.quest[name]){
            return node.graph.quest[name];
        }else if(node.graph.scenes){
            var toReturn = [];
            for (var i = 0; i < node.graph.scenes.length; i++) {
                if(node.graph.scenes[i][name]){
                    toReturn = toReturn.concat(node.graph.scenes[i][name]);
                }
            }
            return toReturn;
        }else if(node.graph[name]){
            return node.graph[name];
        }else{
            return null;
        }
    }

    /**
     * Does everything needed in order to assign a GLP to a class. (explained inside)
     * @param  {object}   body     The GLP object to be assigned
     * @param  {string}   classId  The id of the class to assign to
     * @param  {string}   teacher  The username of the teacher owner of the class
     * @param  {object}   config   The config of the application
     * @param  {esclient} esClient The ElasticSearch client
     * @param  {Function} callback The function to call when everything ends
     * @return {object}            The assigned GLP or the error that have happened
     */
    glpHandler.assigned = function(body, classId, teacher, config, esClient, callback){

        // The class is obtained. If no class for that teacher, dont continues
        userHandler.getClass(classId, teacher, config, function(error, classe){
            if(error){
                return callback({message: 'Error obtaining the class.', error: error});
            }

            // Obtains the GLP
            var glp = body.glp;

            var gameId = config.beaconing.gameId;
            if(body.gameId){
                gameId = body.gameId;
            }

            var versionId = config.beaconing.versionId;
            if(body.versionId){
                versionId = body.versionId;
            }

            var content = {};
            // Sometimes the partners do the request with the GLP in various formats. If content,
            // we try to parse it as it is the GLP
            if(glp.content){
                content = JSON.parse(glp.content);
            }else{
                content = glp;
            }

            // Nodes contains the list of activities to be created in backend
            var nodes = [];
            // Another representation of nodes list easier to manage by createTreeInElastic function
            var tree = {
                node: content,
                children: []
            };

            // Completed function is used to syncronice every task inside this function. Uses Total
            // and Completed to know how much of the completion status is atchieved.
            var total = 0, completed = 0;
            var Completed = function(error, activity){
                if(error){
                    console.log("error on the creation of the activity");
                    return callback(error);
                }else{
                    completed++;

                    console.log('Completed '  + completed + '/' + total);

                    if(completed >= total){
                        // When every activity is created, and its dashboards updated, we create the tree
                        // in elastic for the Multi-level analysis

                        glpHandler.createTreeInElastic(tree, total, esClient, function(error, result){
                            glp.content = JSON.stringify(content);
                            
                            callback(null, glp);
                        });
                    }
                }
            }

            // First level, we check for the mission.
            if(!content.missions){
                return callback({ message: 'Missions not found in the GLP.'});
            }
            console.log('GLP -> Missions: ' + content.missions.length);
            for(var i in content.missions){
                // Increase the total number of activities to create and generate the node for both
                // the tree and the nodes list.
                total++;
                var current_mission = {
                    node: content.missions[i],
                    children: []
                };
                current_mission.name = 'mission_'+current_mission.node.id,
                tree.children.push(current_mission);
                nodes[current_mission.name] = current_mission.node;

                console.log('Mission (' + current_mission.name + ')');

                // Second level, we check for quest inside the missions
                for(var j in current_mission.node.quests){
                    // Increase the total number of activities to create and generate the node for both
                    // the tree and the nodes list.
                    total++;
                    var current_quest = {
                        node: content.missions[i].quests[j],
                        children: []
                    };
                    current_quest.name = 'quest_'+current_mission.node.id + '_' + current_quest.node.id;
                    current_mission.children.push(current_quest);

                    nodes[current_quest.name] = current_quest.node;
                    console.log('- Quest (' + current_quest.name + ')');
                    var lbgChildren = [];

                    // Third level, we check for Location Based Games inside the quests
                    var locationBasedGames = getLocationBasedGames(current_quest.node);
                    if(locationBasedGames){
                        for(var k in locationBasedGames){
                            if(locationBasedGames[k].gameID == null || locationBasedGames[k].gameID == '')
                                continue;
                            
                            // As before, every LBG is an activity. LBGs with minigames in them add
                            // another level to the tree. These minigames are marked at the end of this
                            // foreach.
                            total++;
                            var current_lbg = {
                                node: locationBasedGames[k],
                                children: []
                            };
                            current_lbg.name = 'LBG_' + current_mission.node.id 
                                    + '_' + current_quest.node.id
                                    + '_' + current_lbg.node.name
                                    + '_' + current_lbg.node.gameID + total;
                            current_quest.children.push(current_lbg);

                            console.log('-- Location Based Game (' + current_lbg.name + ')');

                            nodes[current_lbg.name] = current_lbg.node;

                            // For every node marked as children in the LBG we add them to a dictionary where
                            // the children ID is the key, and the current LBG is the parent.
                            for(var n = 0; n < current_lbg.node.nodes.length; n++){
                                lbgChildren[current_lbg.node.nodes[n].toString()] = current_lbg;
                            }
                        }
                    }

                    // Third level again, we check for challenges inside the quest.
                    var challenges = getChallenges(current_quest.node);
                    if(challenges){
                        for(var k in challenges){
                            // Challenges, besides whatever other type of node, doesn't create another
                            // level into the hirearchy, so no activity for them.
                            var current_challenge = {
                                node: challenges[k],
                                children: []
                            };
                            current_challenge.name = current_challenge.node.id + '_'+ current_challenge.node.name

                            console.log('-- Challenge (' + current_challenge.name + ')');

                            for(var l in current_challenge.node.activities){
                                // However, if the challenge contains activities (AKA minigames), we must
                                // add them to the tree.
                                total++;
                                var current_activity = {
                                    node: current_challenge.node.activities[l],
                                    children: [] 
                                };

                                // As an special case, we check if this node has been marked as an LBG
                                // node. If it is, the parent node will be the LBG instead of the quest.
                                var lbgparent = lbgChildren[current_challenge.node.id];

                                current_activity.name = 'activity_' + current_mission.node.id 
                                    + '_' + current_quest.node.id
                                    + '_' + current_challenge.node.id + '_'
                                    + (lbgparent ? '_' + lbgparent.node.gameID : '')
                                    + total
                                    + '_' + current_activity.node.session_id;


                                if(lbgparent){
                                    // Case where the parent is the LBG (5th level on the tree)
                                    lbgparent.children.push(current_activity)
                                    console.log('--- LBActivity (' + current_activity.name + ')');
                                }else{
                                    // Case where the parent is the quest (4th level on the tree)
                                    current_quest.children.push(current_activity)
                                    console.log('-- Activity (' + current_activity.name + ')');
                                }

                                nodes[current_activity.name] = current_activity.node;
                            }
                        }
                    }
                }
            }

            // After we create the list of nodes and the tree, we create the Activity Bundles. First, we
            // do everything for the root node, and then for each of the nodes, waiting for all of them
            // to be completed.
            glpHandler.ActivityBundle(content, null, content, gameId, versionId, 
                classe._id, teacher, null, config, function(error, rootActivity){
                    if(error){
                        console.log("error updating root dashboard");
                        return callback(error);
                    }else{
                        for (var id in nodes) {
                            glpHandler.ActivityBundle(content, id, nodes[id], gameId, versionId, 
                                classe._id, teacher, rootActivity._id, config, Completed);
                        }
                    }
                });
        });
    };

    /**
     * Creates an Activity in backend, and after that adds the TrackingCode, ActivityId and Dashboard Link inside the
     * node used for the request.
     * @param  {string}   name          Name for the activity to be created
     * @param  {string}   gameId        ID of the game that will be assigned to the class when creating the activity
     * @param  {string}   versionId     ID of the version of the game
     * @param  {string}   classId       ID of the class to be assigned.
     * @param  {string}   teacher       Username of the teacher that creates the activity.
     * @param  {string}   rootId        ID of the root node of the tree of activities or null if it's a single activity
     * @param  {object}   original_node Node object extracted from the original GLP to insert the activity data
     * @param  {object}   config        App config for urls and auth
     * @param  {Function} callback      Callback function to call when everything is completed
     * @return {object}                 Activity created or error if so.
     */
    glpHandler.createActivity = function(name, gameId, versionId, classId, teacher, rootId, original_node, config, callback){
    	request({
            uri: config.backendUrl + 'api/activities/bundle',
            method: 'POST',
            body: {
                name: name,
                gameId: gameId,
                versionId: versionId,
                classId: classId,
                rootId: rootId,
                offline: false
            },
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
            	console.log("ERROR");
            	console.log(JSON.stringify(err, null, 2));
            	console.log(JSON.stringify(httpResponse, null, 2));
                return callback(body);
            }

            if(original_node){
                if(!getAnalytics(original_node))
                    return callback({message: 'Node ('+original_node.name+') not contains analytics JSON.'});

                getAnalytics(original_node).trackingCode = body.trackingCode;
                getAnalytics(original_node).activityId = body._id;
                getAnalytics(original_node).dashboard = config.beaconing.baseUrl + 'api/proxy/kibana/app/kibana#/dashboard/dashboard_' +
                        body._id + '?embed=true_g=(refreshInterval:(display:\'5%20seconds\',' +
                        'pause:!f,section:1,value:5000),time:(from:now-1h,mode:quick,to:now))';

                console.log('Activity (' + body._id + ') Created: ' + name);
            }

            callback(null, body);
        });
    };

    /**
     * Starts an activity. By default all activities are stopped and this is needed to start collecting data
     * @param  {string}   activityId The ID of the activity to be started.
     * @param  {string}   teacher    Username of the teacher to do the request needed for auth
     * @param  {object}   config     App config for urls and auth
     * @param  {Function} callback   Callback function to call when everything is completed
     * @return {object}              Null or error if so.
     */
    glpHandler.startActivity = function(activityId, teacher, config, callback){
        request({
            uri: config.backendUrl + 'api/activities/' + activityId + '/event/start',
            method: 'POST',
            body: {},
            json: true,
            headers: {
                'x-gleaner-user': teacher
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log("ERROR");
                console.log(JSON.stringify(err, null, 2));
                console.log(JSON.stringify(httpResponse, null, 2));
                return callback(body);
            }

            console.log('Activity (' + activityId + ') Started');

            callback(null, body);
        });
    };

    /**
     * Creates an activity, starts id and updates its dashboard.
     * @param {string}   content   The GLP content object
     * @param {string}   id        The ID of the activity to be created (not backend ActivityID but GLP unique ID)
     * @param {object}   node      Node object extracted from the original GLP to insert the activity data
     * @param {string}   gameId    ID of the game that will be assigned to the class when creating the activity
     * @param {string}   versionId ID of the version of the game
     * @param {string}   classId   ID of the class to be assigned.
     * @param {string}   teacher   Username of the teacher that creates the activity.
     * @param {string}   rootId    ID of the root node of the tree of activities or null if it's a single activity
     * @param {object}   config    App config for urls and auth
     * @param {Function} callback  Callback function to call when everything is completed
     * @return {object}            Activity created or error if so.
     */
    glpHandler.ActivityBundle = function(content, id, node, gameId, versionId, classId, teacher, rootId, config, callback){
        var name = content.id + (id ? '_' + id : '') + '_(' + node.name + ')'

        console.log('Creating: ' + name);

        glpHandler.createActivity(name, gameId,versionId, classId, teacher, rootId, node, config, function(error, activity){
                if(error){
                    return callback(error);
                }else{
                    glpHandler.startActivity(activity._id, teacher, config, function(error, result){
                        if(error){
                            console.log("error starting activity");
                            return callback(error);
                        }else{
                            callback(null, activity);
                        }
                    });
                }
            });
    };

    /**
     * Creates the tree of activities in elastic needed to perform the Multi-Level analysis.
     * @param  {object}   tree     The tree of activities
     * @param  {int}      total    The total number of activities to be linked, used for completion status on recursive method
     * @param  {esclient} esClient ElasticSearch client for inserting the Analytics documents
     * @param  {Function} callback Callback function to call when everything is completed.
     * @return {object}            Null or error if so.
     */
    glpHandler.createTreeInElastic = function(tree, total, esClient, callback){
    	var rootId = getAnalytics(tree.node).activityId;
    	total++;

    	var inserted = 0;
    	var cb = function(error){
    		if(error){
    			console.log(error);
                callback(error);
    		}
    		inserted++;
    		console.log('inserted in elastic ' + inserted);

    		if(inserted >= total){
    			callback();
    		}
    	}
    	
        // Once the common callback and the rootId are set, we start the recursive loop
        // to insert every activity in the common document.
    	glpHandler.createTreeRecursive(tree, null, rootId, esClient, cb);
    };

    /**
     * Used by createTreeInElastic, creates the tree recursively, inserting in elastic every document
     * needed for the Multi-level analysis
     * @param  {object}   current  The current node for the loop
     * @param  {string}   parentId The ID of the parent node needed to insert in elastic
     * @param  {string}   rootId   The ID of the root node that sets up the common document
     * @param  {esclient} esClient ElasticSearch client for inserting the Analytics documents
     * @param  {Function} callback Callback function to call when everything is completed.
     * @return {object}            Null or error if so.
     */
    glpHandler.createTreeRecursive = function(current, parentId, rootId, esClient, callback){
        var children_activityIds = [];
        // The base to insert in elastic is the Analytics document with IDs, thresholds and limits
        var current_analytics = getAnalytics(current.node);

        if(!current_analytics)
            return callback({message: 'Node ('+current.node.name+') not contains analytics JSON.'});

        var child = null;
        for (var c in current.children) {
            // For each of the children, we add their IDs to a list to generate the list of children of this
            // node. After that, the recursive call is done.
            child = current.children[c];
            children_activityIds.push(getAnalytics(child.node).activityId);
            glpHandler.createTreeRecursive(child, current_analytics.activityId, rootId, esClient, callback);
        }

        // Then, after every list of children is generated, from child to parent, the objects are added
        // to elastic. 
        var toInsert = {
            name: current.node.name,
            limits: current_analytics.limits,
            contributes: current_analytics.contributes,
            children: children_activityIds
        };

        if(parentId){
            toInsert.parentId = parentId;
        }

        glpHandler.insertStructure(rootId, current_analytics.activityId, toInsert, esClient, callback);
    };

    /**
     * Inserts an analytics object in Elastic needed for the Multi-Level analysis
     * @param  {string}   rootId     ID of the root activity needed to find the common document
     * @param  {string}   activityId ID of the current activity owner of the document
     * @param  {object}   body       The Analytics object to be inserted
     * @param  {esclient} esClient   The ElasticSearch client.
     * @param  {Function} callback   Callback function to call when everything is done.
     * @return {object}              Null or error if so.
     */
    glpHandler.insertStructure = function(rootId, activityId, body, esClient, callback){
        var contributes = {
            learningObjectives: {},
            competencies: {}
        };

        // Before inserting anything in elastic, we must check the integrity of the document to insert.
        // If the document doesn't have either Limits or contributes, we must add the default ones.
        
        // First, we check if the limits exist, and, if no, we add the default ones
        if(!body.limits){
            body.limits = {
                maxTime: 120,
                maxAttempts: 3,
                partialThreshold: {
                    learningObjectives: 0.5,
                    competences: 0.5,
                    scores: 0.5
                },
                fullThreshold: {
                    learningObjectives: 0.7,
                    competences: 0.7,
                    scores: 0.7
                }
            };
        }

        // Second, we check individually if we have every component inside limits and we set up the default ones.
        if(!body.limits.partialThreshold){
            body.limits.partialThreshold = {
                learningObjectives: 0.5,
                competences: 0.5,
                scores: 0.5
            };
        }
        if(!body.limits.fullThreshold){
            body.limits.fullThreshold = {
                learningObjectives: 0.7,
                competences: 0.7,
                scores: 0.7
            };
        }

        // Additionally, beaconing partners didn't fit the design calling threshold instead of thresholdS in plural.
        // so we move them and then delete the other object.
        body.limits.partialThresholds = body.limits.partialThreshold;
        body.limits.fullThresholds = body.limits.fullThreshold;
        delete body.limits.partialThreshold;
        delete body.limits.fullThreshold;

        // Third, if we have no contributes, we create the object and the arrays.
        if(!body.contributes){
            body.contributes = {
                learningObjectives: [],
                competences: []
            };
        }

        // Fourth, and last, we transform the also non-fit by beaconing partners structure into what is needed.
        for(var l in body.contributes.learningObjectives){
            if(body.contributes.learningObjectives[l].name !== ''){
                contributes.learningObjectives[body.contributes.learningObjectives[l].name] = body.contributes.learningObjectives[l].percentage;
            }
        }

        for(var c in body.contributes.competences){
            if(body.contributes.competences[c].name !== ''){
                contributes.competencies[body.contributes.competences[c].name] = body.contributes.competences[c].percentage;
            }
        }

        /**
         * This internal function is needed because of a bug in elasticsearch. Every percentage is from 0.0 to 1.0 but elasticsearch
         * Interpretes 0 and 1 as integers and 0.1, 0.2, etc as floats, what causes bugs. So we created this function in order
         * to generates an object that transforms every 0 and 1 into 0.0 and 1.0.
         * @param  {object} o The current object being analyzed to check if it's an integer that must be transformed into float.
         */
        function floatizeIntegers(o) {
            var p;
            for (p in o) {
                if(typeof o[p] === 'object') {
                    floatizeIntegers(o[p]);
                }else{
                    if( Number.isInteger(o[p])){
                        o[p] = "REMOVEQUOTES" + o[p].toFixed(1);
                    }
                }
            }
        }

        body.contributes = contributes;

        // In the end we create a clone of the object to insert, we floatize it, and finally, we save it in elastic.
        var cloned = JSON.parse(JSON.stringify(body));
        floatizeIntegers(cloned);
        let stringified = JSON.stringify(cloned).replace(/"REMOVEQUOTES(.*?)\.0"/g, "$1.0");

    	esClient.index({
            index: 'analytics-' + rootId,
            type: 'analytics',
            id: activityId,
            body: stringified
        }, function (error, response) {
            callback(error);
        });
    };

    return glpHandler;
})();