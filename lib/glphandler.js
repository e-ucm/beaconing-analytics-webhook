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

var TimeTracker = function(){
    var counting = 0;
    var _times = {};

    this.Start = function(id){
        let time = new Date().getTime();

        if(id === null){
            do{
                id = Math.floor(Math.random() * 1000000).toString();
            }while(_times[id]);
        }
        _times[id] = time;
        return id;
    }

    this.Stop = function(id){
        delete _times[id];
    }

    this.Result = function(id){
        var ret = (new Date().getTime()) - _times[id];
        this.Stop(id);
        return ret;
    }
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

module.exports = (function () {

    var tracker = new TimeTracker();

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
        if(!node.graph){
            return null;
        }else if(node.graph.quest && node.graph.quest.challenges){
            return node.graph.quest.challenges;
        }else if(node.graph.scenes){
            var challenges = [];
            for (var i = 0; i < node.graph.scenes.length; i++) {
                if(node.graph.scenes[i].challenges){
                    challenges = challenges.concat(node.graph.scenes[i].challenges);
                }
            }
            return challenges;
        }else if(node.graph.challenges){
            return node.graph.challenges;
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
                    glpHandler.createTreeInElastic(content, total, esClient, function(error, result){
                        glp.content = JSON.stringify(content);
                        
                        callback(null, glp);
                    });
                }
            }

            var nodes = [];

            if(!content.missions){
                return callback({ message: 'Missions not found in the GLP.'});
            }
            //crear actividad raiz
            console.log('GLP -> Missions: ' + content.missions.length);
            for(var i in content.missions){
                total++;
                var current_mission = content.missions[i];

                nodes['mission_'+current_mission.id] = current_mission;

                //Crear actividad
                console.log('GLP -> Mission (' + current_mission.id + ') ' + current_mission.name);

                for(var j in current_mission.quests){
                    total++;
                    var current_quest = content.missions[i].quests[j];

                    nodes['quest_'+current_mission.id + '_' + current_quest.id] = current_quest;
                    console.log('    Quest (' + current_quest.id + ') ' + current_quest.name);

                    var challenges = getChallenges(current_quest);
                    if(!challenges)
                        continue;

                    for(var k in challenges){
                        var current_challenge = challenges[k];

                        console.log('        Challenge (' + current_challenge.id + ') '
                         + current_challenge.name);

                        for(var l in current_challenge.activities){
                            total++;
                            var current_activity = current_challenge.activities[l];

                            nodes['activity_' + current_mission.id + '_' + current_quest.id + '_'
                                + current_challenge.id + '_' + total + '_' + current_activity.session_id] = current_activity;

                            console.log('            Activity (' + current_activity.session_id + ') ' + current_activity.name);
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
        let timerId = tracker.Start();
        console.log('glpHandler.createActivity -> started: ' +  name);
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
            	console.log("glpHandler.createActivity -> ERROR");
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

            console.log('glpHandler.createActivity -> COMPLETED (' + tracker.Result(timerId) + '): ' +  name);

            callback(null, body);
        });
    }

    glpHandler.startActivity = function(activityId, teacher, config, callback){
        let timerId = tracker.Start();
        console.log('glpHandler.startActivity -> started: ' +  activityId);
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

            console.log('glpHandler.startActivity -> COMPLETED (' + tracker.Result(timerId) + '): ' +  activityId);
            callback(null, body);
        });
    }

    glpHandler.updateDashboard = function(activityId, dashboard, config, callback){
        console.log(JSON.stringify(dashboard));
        
        let timerId = tracker.Start('dash' + activityId);
        console.log('glpHandler.updateDashboard -> started: ' +  activityId);
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

            console.log('glpHandler.updateDashboard -> COMPLETED (' + tracker.Result('dash' + activityId) + '): ' +  activityId);

            callback(null, body);
        });
    }

    glpHandler.createTreeInElastic = function(glp, total, esClient, callback){
        let timerId = tracker.Start();

    	var rootId = getAnalytics(glp).activityId;
        console.log('glpHandler.createTreeInElastic -> started: ' +  rootId);
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
                console.log('glpHandler.createTreeInElastic -> COMPLETED (' + tracker.Result(timerId) + '): ' +  rootId);
    			callback();
    		}
    	}
    	
    	var glp_childs = [];
		for(var i in glp.missions){
			var mission_childs = [];
            var current_mission = glp.missions[i];
			glp_childs.push(getAnalytics(current_mission).activityId);

			for(var j in current_mission.quests){
                var current_quest = current_mission.quests[j];
				mission_childs.push(getAnalytics(current_quest).activityId);

				var quest_childs = [];

                var challenges = getChallenges(current_quest);

                if(challenges){
    				for(var k in challenges){
    					for(var l in challenges[k].activities){
    						var current_activity = challenges[k].activities[l];
    						quest_childs.push(getAnalytics(current_activity).activityId);

                            if(!getAnalytics(current_activity))
                                return callback({message: 'Node ('+current_activity.name+') not contains analytics JSON.'});

    						glpHandler.insertStructure(rootId, getAnalytics(current_activity).activityId,
    						{
                                name: current_activity.name,
    							limits: getAnalytics(current_activity).limits,
    							contributes: getAnalytics(current_activity).contributes,
    							parentId: getAnalytics(current_quest).activityId
    						}, esClient, cb);
    					}
    				}
                }

                if(!getAnalytics(current_quest))
                    return callback({message: 'Node ('+current_quest.name+') not contains analytics JSON.'});

				glpHandler.insertStructure(rootId, getAnalytics(current_quest).activityId,
				{
                    name: current_quest.name,
					limits: getAnalytics(current_quest).limits,
					contributes: getAnalytics(current_quest).contributes,
					children: quest_childs,
					parentId: getAnalytics(current_mission).activityId
				}, esClient, cb);
			}

            if(!getAnalytics(current_mission))
                    return callback({message: 'Node ('+current_mission.name+') not contains analytics JSON.'});

			glpHandler.insertStructure(rootId, getAnalytics(current_mission).activityId,
			{
                name: current_mission.name,
				limits: getAnalytics(current_mission).limits,
				contributes: getAnalytics(current_mission).contributes,
				children: mission_childs,
				parentId: rootId
			}, esClient, cb);
		}

        if(!getAnalytics(glp))
            return callback({message: 'Node ('+glp.name+') not contains analytics JSON.'});

		glpHandler.insertStructure(rootId, getAnalytics(glp).activityId,
		{
            name: glp.name,
			limits: getAnalytics(glp).limits,
			contributes: getAnalytics(glp).contributes,
			children: glp_childs
		}, esClient, cb);
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

        body.contributes = contributes;

    	esClient.index({
            index: 'analytics-' + rootId,
            type: 'analytics',
            id: activityId,
            body: body
        }, function (error, response) {
            callback(error);
        });
    }

    return glpHandler;
})();

/*

var setTrackingCode = function(node){
	console.log(node.analytics);
	node.analytics.trackingCode = "testoru";
	node.analytics.dashboard = "https://testoru/";
}

var checkTrackingCode = function(node){
	if(!checkTrackingCodeP(node)){
		console.log('ALERTA MAXIMA');
	}
}

var checkTrackingCodeP = function(node){
	return node.analytics.trackingCode == "testoru" && node.analytics.dashboard == "https://testoru/"
}

var t = require('./glp.json');

var content = JSON.parse(t.content);

console.log(content);

console.log('GLP -> Missions: ' + content.missions.length);
for(var i in content.missions){
  console.log('GLP -> Mission (' + content.missions[i].id + ') ' + content.missions[i].name);
  setTrackingCode(content.missions[i]);

  for(var j in content.missions[i].quests){
  	console.log('    Quest (' + content.missions[i].quests[j].id + ') ' + content.missions[i].quests[j].name);
  	setTrackingCode(content.missions[i].quests[j]);

    for(var k in content.missions[i].quests[j].graph.quest.challenges){
      console.log('        Challenge (' + content.missions[i].quests[j].graph.quest.challenges[k].id + ') ' + content.missions[i].quests[j].graph.quest.challenges[k].name);
      //setTrackingCode(content.missions[i].quests[j].graph.quest.challenges[k]);

      for(var l in content.missions[i].quests[j].graph.quest.challenges[k].activities){
        //console.log(content.missions[i].quests[j].graph.quest.challenges[k].activities[l]);
        console.log('            Activity (' + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].session_id + ') ' + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].name);
        setTrackingCode(content.missions[i].quests[j].graph.quest.challenges[k].activities[l]);

      }
    }
  }
}

for(var i in content.missions){
  console.log('GLP -> Mission (' + content.missions[i].id + ') ' + content.missions[i].name);
  checkTrackingCode(content.missions[i]);

  for(var j in content.missions[i].quests){
  	console.log('    Quest (' + content.missions[i].quests[j].id + ') ' + content.missions[i].quests[j].name);
  	checkTrackingCode(content.missions[i].quests[j]);

    for(var k in content.missions[i].quests[j].graph.quest.challenges){
      console.log('        Challenge (' + content.missions[i].quests[j].graph.quest.challenges[k].id + ') ' + content.missions[i].quests[j].graph.quest.challenges[k].name);
      //checkTrackingCode(content.missions[i].quests[j].graph.quest.challenges[k]);

      for(var l in content.missions[i].quests[j].graph.quest.challenges[k].activities){
        //console.log(content.missions[i].quests[j].graph.quest.challenges[k].activities[l]);
        console.log('            Activity (' + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].session_id + ') ' + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].name);
        checkTrackingCode(content.missions[i].quests[j].graph.quest.challenges[k].activities[l]);
        
      }
    }
  }
}*/