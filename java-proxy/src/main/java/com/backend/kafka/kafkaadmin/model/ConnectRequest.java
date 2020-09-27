package com.backend.kafka.kafkaadmin.model;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter @Setter @ToString
public class ConnectRequest {
    private String name;
    private String brokers;
}
