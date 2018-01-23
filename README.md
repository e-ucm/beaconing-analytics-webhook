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
