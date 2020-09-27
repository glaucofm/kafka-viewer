package com.backend.kafka.kafkaadmin.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class TopicOffset {
    private int partition;
    private Long start;
    private Long end;
    private Long position;
    private Long stopPos;
    @JsonIgnore private boolean isFinished;

    public TopicOffset(int partition) {
        this.partition = partition;
    }
}
