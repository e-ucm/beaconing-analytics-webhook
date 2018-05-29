# beaconing-analytics-webhook

This code belongs to e-UCM research group and has been developed for the H2020 BEACONING Project and sends analytics information to a server; or, if the server is currently unavailable, stores them locally until it becomes available again.

![Beaconing logo](http://beaconing.eu/wp-content/themes/beaconing/images/logo/original_version_(black).png)

This repository helps to create webhooks to notify events. A webhook may contain the following fields:

* name: name of the webhook
* payload_url: the endpoint url to be notified
* content_type: the type of the event (e.g. application/json, application/xml)
* secret _(not used so far)_
* active: whether the webhook is active or not

## Usage

Creation and deletion of webhooks and events is possible via the following routes. To enter the webhook, a password is required. This password is located in the root directory of the analytics framework in a file named `.env` .

### Webhooks

* `GET /webhooks/`: lists the webhooks
* `POST /webhooks/`: creates a webhook
* `GET /webhooks/delete/id`: deletes the webhook with id

![webhook](https://user-images.githubusercontent.com/19714314/35278044-acd8f654-0040-11e8-8d20-914a530505e3.png)

### Events

* `GET /events/`: lists the event types
* `POST /events/`: creates an event type
* `GET /events/delete/id`: deletes the event type with id
* `POST /events/collector/event_type`: sends its body to the webhooks. The endpoints will receive a header with the event_type annd the body sent.

![eventtype](https://user-images.githubusercontent.com/19714314/35278045-ae144adc-0040-11e8-8db2-71f9e86934fd.png)

#### Special Events

There are 5 special events. Those events have been hardcoded and behave as synchronous instead of the async workflow of a webhook. Every Special event **must be authenticated**, including a valid A2 Authentication header (see http://e-ucm.github.io/a2/#api-Login-Login). These events are the following:

##### GLP Assigned

When a GLP is assigned to a group in Beaconing, webhook is notified and creates the Activities, Dashboards, and everything needed to collect data.

Event info:
* `POST /events/glp_assigned`: creates everything required for that GLP to perform analysis
* `BODY params`: 
  * glp: the GLP to be assigned.
  * groupId: the ID of the group the GLP is being assigned to.
* API Result: Decorated GLP (GLP + tracking codes + dashboard links + ActivityIDs)
  * Errors is something is missing or something fails

##### User Created

When a user is created in Beaconing, webhook is notified and creates a clone of that user.

Event info:
* `POST /events/user_created`: creates a clone of the user
* `BODY params`: 
  * id: the beaconing ID of that user.
  * username: the username of the created user.
  * role: the role can be either teacher or student.
* API Result: success if everything is alright.
  * Errors is something is missing or something fails

##### Group Created

When a group is created in Beaconing, webhook is notified and creates a clone of that group.

Event info:
* `POST /events/group_created`: creates an clone of the group
* `BODY params`: 
  * id: the beaconing ID of that group.
  * name: a name for the group.
  * students[]: array of student ids.
* API Result: success if everything is alright.
  * Errors is something is missing or something fails

##### Group Participants Added

When participants are added to a group, webhook is notified and updates the group.

Event info:
* `POST /events/group_participants_added`: adds participants to a group
* `BODY params`: 
  * id: the beaconing ID of that group.
  * participants: object that may contain:
    * student[]: array of the students to be added
    * teachers[]: array of the teachers to be added
* API Result: success if everything is alright.
  * Errors is something is missing or something fails

##### Group Participants Removed

When participants are removed to a group, webhook is notified and updates the group.

Event info:
* `POST /events/group_participants_removed`: removes participants from a group
* `BODY params`: 
  * id: the beaconing ID of that group.
  * participants: object that may contain:
    * student[]: array of the students to be removed
    * teachers[]: array of the teachers to be removed
* API Result: success if everything is alright.
  * Errors is something is missing or something fails
  

##### Group Removed

When a group is removed, webhook is notified and removes the group.

Event info:
* `POST /events/group_removed`: removes a group
* `BODY params`: 
  * id: the beaconing ID of that group.
* API Result: success if everything is alright.
  * Errors is something is missing or something fails
  
