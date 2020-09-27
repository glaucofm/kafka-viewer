package com.backend.kafka.kafkaadmin.model;

import lombok.Getter;
import lombok.Setter;
import org.apache.kafka.clients.admin.AdminClient;

import java.util.*;

@Getter @Setter
public class Connection {
    private String name;
    private String brokers;
    private AdminClient client;
    private Map<String, ConsumerControl> consumers = new HashMap<>();
    private List<Message> messages = Collections.synchronizedList(new ArrayList<>());

    public Connection(String name, String brokers, AdminClient client) {
        this.name = name;
        this.brokers = brokers;
        this.client = client;
    }
}
