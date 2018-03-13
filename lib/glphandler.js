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

    var glpHandler = {};

    glpHandler.assigned = function(glp, config, esClient, callback){

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

        //crear actividad raiz
		console.log('GLP -> Missions: ' + content.missions.length);
		for(var i in content.missions){
			total++;
			nodes['mission_'+content.missions[i].id] = content.missions[i];

			//Crear actividad
			console.log('GLP -> Mission (' + content.missions[i].id + ') ' + content.missions[i].name);

			for(var j in content.missions[i].quests){
				//crear
				total++;
				nodes['quest_'+content.missions[i].quests[j].id] = content.missions[i].quests[j];

				console.log('    Quest (' + content.missions[i].quests[j].id + ') ' + content.missions[i].quests[j].name);
				for(var k in content.missions[i].quests[j].graph.quest.challenges){
					console.log('        Challenge (' + content.missions[i].quests[j].graph.quest.challenges[k].id + ') '
					 + content.missions[i].quests[j].graph.quest.challenges[k].name);

					for(var l in content.missions[i].quests[j].graph.quest.challenges[k].activities){
						//crear actividad
						total++;
						nodes['session_'+content.missions[i].quests[j].graph.quest.challenges[k].activities[l].session_id] = 
							content.missions[i].quests[j].graph.quest.challenges[k].activities[l];

						console.log('            Activity (' + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].session_id + ') '
						 + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].name);
					}
				}
			}
		}

		glpHandler.createActivity(content.id + '_(' + content.name + ')', '5a9d8b51d4d13a0077ddb99b', '5a9d8b51d4d13a0077ddb99c',
            '5a9d8bd0d4d13a0077ddb99d', 'teacher', null, content, config, 
			function(error, result){
				if(error){
					return callback(error);
				}

                glpHandler.startActivity(result._id, 'teacher', config, function(error, result){
                    if(error){
                        return callback(error);
                    }else{
                        for (var id in nodes) {
                            console.log('Creating: ' + content.id + '_' + id + '_(' + nodes[id].name + ')');

                            glpHandler.createActivity(content.id + '_' + id + '_(' + nodes[id].name + ')', '5a9d8b51d4d13a0077ddb99b',
                                '5a9d8b51d4d13a0077ddb99c', '5a9d8bd0d4d13a0077ddb99d', 'teacher', result._id, nodes[id], config, 
                                function(error, result){
                                    if(error){
                                        return callback(error);
                                    }else{
                                        glpHandler.startActivity(result._id, 'teacher', config, function(error, result){
                                            if(error){
                                                console.log("error starting activity");
                                                return callback(error);
                                            }else{
                                                Completed();
                                            }
                                        });
                                    }
                                });
                        }
                    }
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

            original_node.analytics.json.analytics.trackingCode = body.trackingCode;
            original_node.analytics.activityId = body._id;
            original_node.analytics.json.analytics.activityId = body._id;
            original_node.analytics.json.analytics.dashboard = 'https://analytics.beaconing.eu/api/proxy/kibana/app/kibana#/dashboard/dashboard_' +
                    body._id + '?embed=true_g=(refreshInterval:(display:\'5%20seconds\',' +
                    'pause:!f,section:1,value:5000),time:(from:now-1h,mode:quick,to:now))';

            console.log(JSON.stringify(original_node.analytics, null, 2));

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

            callback(null, body);
        });
    }

    glpHandler.createTreeInElastic = function(glp, total, esClient, callback){
    	var rootId = glp.analytics.activityId;
    	total++;

    	var inserted = 0;
    	var cb = function(error){
    		if(error){
    			console.log(error);
    		}
    		inserted++;
    		console.log('inserted in elastic ' + inserted);

    		if(inserted >= total){
    			callback();
    		}
    	}
    	
    	var glp_childs = [];
		for(var i in glp.missions){
			var mission_childs = [];
			glp_childs.push(glp.missions[i].analytics.activityId);

			var current_mission = glp.missions[i];

			for(var j in glp.missions[i].quests){
				mission_childs.push(glp.missions[i].quests[j].analytics.activityId);
				var current_quest = glp.missions[i].quests[j];

				var quest_childs = [];
				for(var k in glp.missions[i].quests[j].graph.quest.challenges){

					for(var l in glp.missions[i].quests[j].graph.quest.challenges[k].activities){
						var current_activity = glp.missions[i].quests[j].graph.quest.challenges[k].activities[l];
						quest_childs.push(glp.missions[i].quests[j].graph.quest.challenges[k].activities[l].analytics.activityId);

						glpHandler.insertStructure(rootId, current_activity.analytics.activityId,
						{
                            name: current_activity.name,
							limits: current_activity.analytics.json.analytics.limits,
							contributes: current_activity.analytics.json.analytics.contributes,
							parentId: current_quest.analytics.activityId
						}, esClient, cb);
					}
				}

				glpHandler.insertStructure(rootId, current_quest.analytics.activityId,
				{
                    name: current_quest.name,
					limits: current_quest.analytics.json.analytics.limits,
					contributes: current_quest.analytics.json.analytics.contributes,
					children: quest_childs,
					parentId: current_mission.analytics.activityId
				}, esClient, cb);
			}


			glpHandler.insertStructure(rootId, current_mission.analytics.activityId,
			{
                name: current_mission.name,
				limits: current_mission.analytics.json.analytics.limits,
				contributes: current_mission.analytics.json.analytics.contributes,
				children: mission_childs,
				parentId: rootId
			}, esClient, cb);
		}

		glpHandler.insertStructure(rootId, glp.analytics.activityId,
		{
            name: glp.name,
			limits: glp.analytics.json.analytics.limits,
			contributes: glp.analytics.json.analytics.contributes,
			children: glp_childs
		}, esClient, cb);
    }

    glpHandler.insertStructure = function(rootId, activityId, body, esClient, callback){
        var contributes = {
            learningObjectives: {},
            competencies: {}
        };

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

    return glpHandler
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