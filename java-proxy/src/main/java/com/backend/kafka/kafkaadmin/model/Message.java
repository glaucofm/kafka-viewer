package com.backend.kafka.kafkaadmin.model;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter @Setter
public class Message {
    private String topic;
    private String key;
    private Integer size;
    private Long offset;
    private Integer partition;
    private Long timestamp;
    private String payload;
    private Map<String, String> headers;
}
