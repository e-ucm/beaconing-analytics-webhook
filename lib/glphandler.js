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

    glpHandler.assigned = function(glp, config, callback){

        var content = JSON.parse(glp.content);

        var total = 0, completed = 0;
        var Completed = function(){
        	completed++;

        	console.log('Completed '  + completed + '/' + total);

        	if(completed >= total){
        		glp.content = JSON.stringify(content);
        		callback(null, glp);
        	}
        }

        var nodes = [];

        nodes[content._id] = content;

        //crear actividad raiz
		console.log('GLP -> Missions: ' + content.missions.length);
		for(var i in content.missions){

			nodes[content.missions[i]._id] = content.missions[i];

			//Crear actividad
			console.log('GLP -> Mission (' + content.missions[i].id + ') ' + content.missions[i].name);

			for(var j in content.missions[i].quests){
				//crear
				nodes[content.missions[i].quests[j]._id] = content.missions[i].quests[j];

				console.log('    Quest (' + content.missions[i].quests[j].id + ') ' + content.missions[i].quests[j].name);
				for(var k in content.missions[i].quests[j].graph.quest.challenges){
					console.log('        Challenge (' + content.missions[i].quests[j].graph.quest.challenges[k].id + ') '
					 + content.missions[i].quests[j].graph.quest.challenges[k].name);

					for(var l in content.missions[i].quests[j].graph.quest.challenges[k].activities){
						//crear actividad
						nodes[content.missions[i].quests[j].graph.quest.challenges[k].activities[l].session_id] = 
							content.missions[i].quests[j].graph.quest.challenges[k].activities[l];

						console.log('            Activity (' + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].session_id + ') '
						 + content.missions[i].quests[j].graph.quest.challenges[k].activities[l].name);
					}
				}
			}
		}

		total = nodes.length;

		glpHandler.createActivity(content.id + '_(' + content.name + ')', '5a96cf871c4f4b0076dbe0f8', '5a96cf871c4f4b0076dbe0f9', '5a96cfe21c4f4b0076dbe0fa', 'teacher', null, content, config, 
			function(error, result){
				if(error){
					console.log("error creating root");
					return callback(error);
				}

				for (var id in nodes) {
					console.log('Creating: ' + content.id + '_' + id + '_(' + nodes[id].name + ')');

					glpHandler.createActivity(content.id + '_' + id + '_(' + nodes[id].name + ')', '5a96cf871c4f4b0076dbe0f8', '5a96cfe21c4f4b0076dbe0fa', 'teacher', result._id, nodes[id], config, Completed);
				}
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
            if (httpResponse.statusCode !== 200) {
                return callback(body);
            }

            original_node.analytics.trackingCode = body.trackingCode;
            original_node.analytics.dashboard = 'https://analytics.beaconing.eu/api/proxy/kibana/app/kibana#/dashboard/dashboard_' +
                    body._id + '?embed=true_g=(refreshInterval:(display:\'5%20seconds\',' +
                    'pause:!f,section:1,value:5000),time:(from:now-1h,mode:quick,to:now))';

            console.log(JSON.stringify(original_node.analytics, null, 2));

            callback(null, body);
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