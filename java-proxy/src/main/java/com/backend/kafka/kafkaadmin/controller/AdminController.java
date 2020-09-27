package com.backend.kafka.kafkaadmin.controller;

import com.backend.kafka.kafkaadmin.model.ConnectRequest;
import com.backend.kafka.kafkaadmin.model.Message;
import com.backend.kafka.kafkaadmin.model.TopicOffset;
import com.backend.kafka.kafkaadmin.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Transactional
@RequestMapping(value = "/api/admin", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminController {

    @Autowired
    private AdminService adminService;

    @RequestMapping(value = "/connections", method = RequestMethod.POST)
    public ResponseEntity<String> connect(@RequestBody ConnectRequest request) {
        adminService.connect(request.getName(), request.getBrokers());
        return new ResponseEntity("{}", HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}", method = RequestMethod.DELETE)
    public ResponseEntity<String> disconnect(@PathVariable("name") String name) {
        adminService.disconnect(name);
        return new ResponseEntity("{}", HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}/topics", method = RequestMethod.GET)
    public ResponseEntity<List<String>> getTopics(@PathVariable("name") String name) {
        return new ResponseEntity(adminService.getTopics(name), HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}/topics/{topic}/offsets", method = RequestMethod.GET)
    public ResponseEntity<List<TopicOffset>> getOffsets(@PathVariable("name") String name,
                                                        @PathVariable("topic") String topic) {
        return new ResponseEntity(adminService.getOffsets(name, topic), HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}/topics/{topic}", method = RequestMethod.POST)
    public ResponseEntity<String> subscribe(@PathVariable("name") String name,
                                            @PathVariable("topic") String topic,
                                            @RequestBody List<TopicOffset> offsets) {
        adminService.subscribe(name, topic, offsets);
        return new ResponseEntity("{}", HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}/topics/{topic}", method = RequestMethod.DELETE)
    public ResponseEntity<String> unsubscribe(@PathVariable("name") String name,
                                              @PathVariable("topic") String topic) {
        adminService.unsubscribe(name, topic);
        return new ResponseEntity("{}", HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}/topics/{topic}", method = RequestMethod.PUT)
    public ResponseEntity<String> produce(@PathVariable("name") String name,
                                          @PathVariable("topic") String topic,
                                          @RequestBody Message message) {
        adminService.sendMessage(name, topic, message);
        return new ResponseEntity("{}", HttpStatus.OK);
    }

    @RequestMapping(value = "/connections/{name}/messages", method = RequestMethod.GET)
    public ResponseEntity<List<Message>> offloadMessages(@PathVariable("name") String name) {
        return new ResponseEntity(adminService.offloadMessages(name), HttpStatus.OK);
    }

    @RequestMapping(value = "", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> amIAlive() {
        return new ResponseEntity("true", HttpStatus.OK);
    }

    /*
    # connect
    curl --header "Content-Type: application/json" --request POST --data '{ "name": "local", "brokers": "localhost:9092" }' http://localhost:7980/api/admin/connections

    # disconnect
    curl --request DELETE http://localhost:7980/api/admin/connections/local

    # topics
    curl 'http://localhost:7980/api/admin/connections/local/topics'

    # offsets
    curl 'http://localhost:7980/api/admin/connections/local/topics/EXAMPLE.TOPIC.SOME.NAME.01/offsets'

    # subscribe
    curl --header "Content-Type: application/json" --request POST --data \
        '[{"partition":0,"position":0},{"partition":1,"position":0},{"partition":2,"position":0},{"partition":3,"position":0},{"partition":4,"position":0}]' \
        http://localhost:7980/api/admin/connections/local/topics/EXAMPLE.TOPIC.SOME.NAME.01

    # produce
    curl --header "Content-Type: application/json" --request PUT --data \
        '{ "value": "glauco" }' \
        http://localhost:7980/api/admin/connections/local/topics/EXAMPLE.TOPIC.SOME.NAME.01

    # messages
    curl 'http://localhost:7980/api/admin/messages'

     */


    /*
    var jarPath = app.getAppPath() + ‘\\student-portal-api.jar’;
    var child = require(‘child_process’).spawn( ‘java’, [‘-jar’, jarPath, ‘’] );
    var kill = require(‘tree-kill’);
    kill(child.pid);
     */
}

