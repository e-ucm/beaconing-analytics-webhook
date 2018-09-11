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
var defaultDashboard = require('./default_dashboard').defaultDashboard;
var defaultDashboardId = 'DEFAULT_DASHBOARD_ID';

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

module.exports = (function () {

    var glpHandler = {};

    var dashboardTemplate = function(id){
        return defaultDashboard.replaceAll(defaultDashboardId, id);
    }

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

    var getChallenges = function(node){
        return get3rdLvlElement(node, 'challenges');
    }

    var getLocationBasedGames = function(node){
        return get3rdLvlElement(node, 'locationBasedGames');
    }

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


    glpHandler.assigned = function(body, classId, teacher, config, esClient, callback){

        userHandler.getClass(classId, teacher, config, function(error, classe){
            if(error){
                return callback({message: 'Error obtaining the class.', error: error});
            }

            var glp = body.glp;

            var gameId = '5b165d4ac7171c007719bc61';
            if(body.gameId){
                gameId = body.gameId;
            }

            var versionId = '5b165d4ac7171c007719bc62';
            if(body.versionId){
                versionId = body.versionId;
            }

            var content = {};
            if(glp.content){
                content = JSON.parse(glp.content);
            }else{
                content = glp;
            }

            var total = 0, completed = 0;
            var Completed = function(){
                completed++;

                console.log('Completed '  + completed + '/' + total);

                if(completed >= total){
                    glpHandler.createTreeInElastic(tree, total, esClient, function(error, result){
                        glp.content = JSON.stringify(content);
                        
                        callback(null, glp);
                    });
                }
            }

            var nodes = [];
            var tree = {
                node: content,
                children: []
            };

            if(!content.missions){
                return callback({ message: 'Missions not found in the GLP.'});
            }
            console.log('GLP -> Missions: ' + content.missions.length);
            for(var i in content.missions){
                total++;
                var current_mission = {
                    node: content.missions[i],
                    children: []
                };
                current_mission.name = 'mission_'+current_mission.node.id,
                tree.children.push(current_mission);
                nodes[current_mission.name] = current_mission.node;

                //Crear actividad
                console.log('Mission (' + current_mission.name + ')');

                var lbgChildren = [];
                for(var j in current_mission.node.quests){
                    total++;
                    var current_quest = {
                        node: content.missions[i].quests[j],
                        children: []
                    };
                    current_quest.name = 'quest_'+current_mission.node.id + '_' + current_quest.node.id;
                    current_mission.children.push(current_quest);

                    nodes[current_quest.name] = current_quest.node;
                    console.log('- Quest (' + current_quest.name + ')');

                    var locationBasedGames = getLocationBasedGames(current_quest.node);
                    if(locationBasedGames){
                        for(var k in locationBasedGames){
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

                            for(var n = 0; n < current_lbg.node.nodes.length; n++){
                                lbgChildren[current_lbg.node.nodes[n].toString()] = current_lbg;
                            }
                        }
                    }

                    var challenges = getChallenges(current_quest.node);
                    if(challenges){
                        for(var k in challenges){
                            var current_challenge = {
                                node: challenges[k],
                                children: []
                            };
                            current_challenge.name = current_challenge.node.id + '_'+ current_challenge.node.name

                            console.log('-- Challenge (' + current_challenge.name + ')');

                            for(var l in current_challenge.node.activities){
                                total++;
                                var current_activity = {
                                    node: current_challenge.node.activities[l],
                                    children: []
                                };
                                var lbgparent = lbgChildren[current_challenge.node.id];

                                current_activity.name = 'activity_' + current_mission.node.id 
                                    + '_' + current_quest.node.id
                                    + '_' + current_challenge.node.id + '_'
                                    + (lbgparent ? '_' + lbgparent.node.gameID : '')
                                    + total
                                    + '_' + current_activity.node.session_id;


                                if(lbgparent){
                                    lbgparent.children.push(current_activity)
                                    console.log('--- LBActivity (' + current_activity.name + ')');
                                }else{
                                    current_quest.children.push(current_activity)
                                    console.log('-- Activity (' + current_activity.name + ')');
                                }

                                nodes[current_activity.name] = current_activity.node;
                            }
                        }
                    }
                }
            }

            glpHandler.createActivity(content.id + '_(' + content.name + ')', gameId, versionId,
                classe._id, teacher, null, content, config, 
                function(error, rootActivity){
                    if(error){
                        return callback(error);
                    }

                    glpHandler.startActivity(rootActivity._id, teacher, config, function(error, result){
                        if(error){
                            return callback(error);
                        }else{
                            if(error){
                                console.log("error starting activity");
                                return callback(error);
                            }else{
                                glpHandler.updateDashboard(rootActivity._id, JSON.parse(dashboardTemplate(rootActivity._id)), config, function(error, result){
                                    if(error){
                                        console.log("error updating root dashboard");
                                        return callback(error);
                                    }else{
                                        for (var id in nodes) {
                                            console.log('Creating: ' + content.id + '_' + id + '_(' + nodes[id].name + ')');

                                            glpHandler.createActivity(content.id + '_' + id + '_(' + nodes[id].name + ')', gameId,
                                                versionId, classe._id, teacher, rootActivity._id, nodes[id], config, 
                                                function(error, result){
                                                    if(error){
                                                        return callback(error);
                                                    }else{
                                                        glpHandler.startActivity(result._id, teacher, config, function(error, result){
                                                            if(error){
                                                                console.log("error starting activity");
                                                                return callback(error);
                                                            }else{
                                                                glpHandler.updateDashboard(result._id, JSON.parse(dashboardTemplate(result._id)), config, function(error, result){
                                                                    if(error){
                                                                        console.log("error updating dashboard");
                                                                        return callback(error);
                                                                    }else{
                                                                        Completed();
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                        }
                                    }
                                });
                            }
                        }
                    });
                });
        });
    };

    glpHandler.createActivity = function(name, gameId, versionId, classId, teacher, rootId, original_node, config, callback){
    	request({
            uri: config.backendUrl + 'api/activities/bundle',
            method: 'POST',
            body: {
                name: name,
                gameId: gameId,
                versionId: versionId,
                classId: classId,
                rootId: rootId
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

            if(!getAnalytics(original_node))
                return callback({message: 'Node ('+original_node.name+') not contains analytics JSON.'});

            getAnalytics(original_node).trackingCode = body.trackingCode;
            getAnalytics(original_node).activityId = body._id;
            getAnalytics(original_node).dashboard = 'https://analytics.beaconing.eu/api/proxy/kibana/app/kibana#/dashboard/dashboard_' +
                    body._id + '?embed=true_g=(refreshInterval:(display:\'5%20seconds\',' +
                    'pause:!f,section:1,value:5000),time:(from:now-1h,mode:quick,to:now))';

            console.log('Activity (' + body._id + ') Created: ' + name);

            callback(null, body);
        });
    }

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
    }

    glpHandler.updateDashboard = function(activityId, dashboard, config, callback){
        request({
            uri: config.a2.a2ApiPath + 'proxy/kibana/api/saved_objects/dashboard/dashboard_' + activityId + '?overwrite=true',
            method: 'POST',
            body: dashboard,
            json: true,
            headers: {
                'Content-Type': 'application/json',
                'kbn-version': '5.6.2'
            }
        }, function (err, httpResponse, body) {
            if (err || (httpResponse && httpResponse.statusCode !== 200)) {
                console.log("ERROR");
                console.log(JSON.stringify(err, null, 2));
                console.log(JSON.stringify(httpResponse, null, 2));
                return callback(body);
            }

            callback(null, body);
        });
    }

    glpHandler.createTreeInElastic = function(glp, total, esClient, callback){
    	var rootId = getAnalytics(glp.node).activityId;
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
    	
    	glpHandler.createTreeRecursive(glp, null, rootId, esClient, cb);
    }

    glpHandler.createTreeRecursive = function(current, parentId, rootId, esClient, callback){
        var children_activityIds = [];
        var current_analytics = getAnalytics(current.node);

        var child = null;
        for (var c in current.children) {
            child = current.children[c];
            children_activityIds.push(getAnalytics(child.node).activityId);
            glpHandler.createTreeRecursive(child, current_analytics.activityId, rootId, esClient, callback);
        }

        if(!getAnalytics(current.node))
            return callback({message: 'Node ('+current.node.name+') not contains analytics JSON.'});

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
    }

    glpHandler.insertStructure = function(rootId, activityId, body, esClient, callback){
        var contributes = {
            learningObjectives: {},
            competencies: {}
        };

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

        if(!body.contributes){
            body.contributes = {
                learningObjectives: [],
                competences: []
            };
        }

        body.limits.partialThresholds = body.limits.partialThreshold;
        body.limits.fullThresholds = body.limits.fullThreshold;

        delete body.limits.partialThreshold;
        delete body.limits.fullThreshold;

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
    }

    return glpHandler;
})();