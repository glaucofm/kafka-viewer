
const KafkaQueryClient = require("./kafka.query.client.js");
const KafkaLoaderClient = require("./kafka.loader.client.js");

const http = require('http');
const port = 8000;

const requestHandler = async (request, response) => {
    if (!request.url.startsWith('/messages')) {
        console.log(request.url);
    }

    if (request.url.startsWith('/connect')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));
        let topics = await newConnection(params.get('name'), params.get('brokers'));
        answer(response, topics);

    } else if (request.url.startsWith('/disconnect')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));
        await disconnect(params.get('name'));
        answer(response);

    } else if (request.url.startsWith('/offsets')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));
        let offsets = await getOffsets(params.get('name'), params.get('topic'));
        answer(response, offsets);

    } else if (request.url.startsWith('/subscribe')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));
        subscribe(params.get('name'), params.get('topic'), params.get('offsets'));
        answer(response);

    } else if (request.url.startsWith('/unsubscribe')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));
        unsubscribe(params.get('name'), params.get('topic'));
        answer(response);

    } else if (request.url.startsWith('/messages')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));
        let messages = connections[params.get('name')].loader.offLoadMessages();
        answer(response, messages);

    } else if (request.url.startsWith('/publish')) {
        const params = new URLSearchParams(request.url.replace(/.*\?/, ''));

        let body = '';
        request.on('data', function(data) {
            body += data;
        });
        request.on('end', function() {
            console.log('Body: ' + body);
            publish(params.get('name'), params.get('topic'), body);
            answer(response);
        });

    } else {
        response.end('404')
    }

    function answer(response, data={ result: 'OK' }) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(data));
    }
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
});

// -------------------------------------------------------

let connections = {}; // GLOBAL list of connections

async function newConnection(name, brokers) {
    console.log('New connection to ' + brokers + ' named ' + name);
    connections[name] = {
        query: new KafkaQueryClient(brokers),
        loader: new KafkaLoaderClient(brokers),
        subscriptions: []
    };
    await connections[name].query.init();
    return connections[name].query.topics;
}

async function disconnect(name) {
    console.log('disconnect ' + name);
    await connections[name].query.disconnect();
    await connections[name].loader.disconnect();
    delete connections[name];
}

async function getOffsets(name, topic) {
    console.log('getOffsets ' + name + ': ' + topic);
    return await connections[name].query.getOffsets(topic);
}

async function subscribe(name, topic, offsets) {
    console.log('subscribe', name, topic, offsets);
    offsets = parseOffsets(offsets);
    console.log(offsets);
    connections[name].subscriptions[topic] = {};
    for (const offset of offsets) {
        connections[name].subscriptions[topic][offset.partition] = offset.position;
    }
    console.log(connections[name].subscriptions);
    connections[name].loader.subscribe(connections[name].subscriptions);
}

function parseOffsets(offsetsString) {
    var offsets = [];
    for (let value of offsetsString.split(',')) {
        offsets.push({
            partition: Number(value.split('=')[0]),
            position: Number(value.split('=')[1])
        });
    }
    return offsets;
}

async function unsubscribe(name, topic) {
    console.log('unsubscribe', name, topic);
    delete connections[name].subscriptions[topic];
    connections[name].loader.subscribe(connections[name].subscriptions);
}

async function publish(name, topic, message) {
    console.log('publish ' + name + ': ' + topic + ', length ' + message.length);
    await connections[name].query.publish(topic, message);
}
