package com.backend.kafka.kafkaadmin.service;

import com.backend.kafka.kafkaadmin.model.Connection;
import com.backend.kafka.kafkaadmin.model.ConsumerControl;
import com.backend.kafka.kafkaadmin.model.Message;
import com.backend.kafka.kafkaadmin.model.TopicOffset;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.header.internals.RecordHeaders;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private Map<String, Connection> connections = new HashMap<>();
    private long lastKeepAlive = -1;

    public void connect(String name, String brokers) {
        Map<String, Object> config = new HashMap<>();
        config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, brokers);
        connections.put(name, new Connection(name, brokers, AdminClient.create(config)));
    }

    public void disconnect(String name) {
        connections.get(name).getClient().close();
        connections.remove(name);
    }

    public List<String> getTopics(String connectionName) {
        try {
            return new ArrayList<>(connections.get(connectionName).getClient()
                    .listTopics().listings().get().stream()
                    .filter(x -> !x.isInternal())
                    .map(x -> x.name())
                    .sorted()
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public List<TopicOffset> getOffsets(String name, String topic) {
        KafkaConsumer<String, String> consumer = getConsumer(name, topic, "offsets");
        try {
            Set<TopicPartition> partitions = getPartitions(consumer);
            Map<Integer, TopicOffset> offsets = partitions.stream().collect(Collectors.toMap(x -> x.partition(), y -> new TopicOffset(y.partition())));
            consumer.seekToBeginning(partitions);
            partitions.forEach(partition -> offsets.get(partition.partition()).setStart(consumer.position(partition)));
            consumer.seekToEnd(partitions);
            partitions.forEach(partition -> offsets.get(partition.partition()).setEnd(consumer.position(partition) - 1));
            consumer.close();
            return offsets.values().stream().sorted(Comparator.comparing(x -> x.getPartition())).collect(Collectors.toList());
        } catch (Exception e) {
            if (consumer != null) {
                consumer.close();
            }
            throw new RuntimeException(e);
        }
    }

    public void subscribe(String name, String topic, List<TopicOffset> offsets) {
        KafkaConsumer<String, String> consumer = getConsumer(name, topic, "subscriber-" +
                (offsets.stream().anyMatch(x -> x.getStopPos() != null)? "temp" : "perm"));
        try {
            Set<TopicPartition> partitions = getPartitions(consumer);
            for (TopicOffset offset : offsets) {
                TopicPartition partition = partitions.stream().filter(x -> x.partition() == offset.getPartition()).findAny().orElse(null);
                if (partition == null) {
                    System.out.println("Partition " + partition + " not found");
                } else {
                    consumer.seek(partition, offset.getPosition());
                }
            }
            Thread thread = new Thread() {
                public void run() {
                    consume(name, topic, offsets, consumer);
                }
            };
            thread.start();
            connections.get(name).getConsumers().put(topic, new ConsumerControl());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void unsubscribe(String name, String topic) {
        connections.get(name).getConsumers().get(topic).setStop(true);
    }

    public List<Message> offloadMessages(String name) {
        lastKeepAlive = System.currentTimeMillis();
        List<Message> tempMessages = new ArrayList<>(connections.get(name).getMessages());
        connections.get(name).getMessages().clear();
        if (tempMessages.size() > 0) {
            System.out.println("Sending " + tempMessages.size() + " messages to the screen.");
        }
        return tempMessages;
    }

    public void sendMessage(String name, String topic, Message message) {
        Properties props = new Properties();
        props.put("bootstrap.servers", connections.get(name).getBrokers());
        props.put("acks", "all");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        RecordHeaders headers = null;
        if (message.getHeaders() != null) {
            headers = new RecordHeaders();
            for (Map.Entry<String, String> header : message.getHeaders().entrySet()) {
                headers.add(header.getKey(), header.getValue().getBytes());
            }
        }
        KafkaProducer<String, String> producer = new KafkaProducer<>(props);
        try {
            producer.send(new ProducerRecord<>(topic, null, null, message.getKey(), message.getPayload(), headers)).get();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        producer.close();
    }

    private void consume(String name, String topic, List<TopicOffset> offsets, KafkaConsumer<String, String> consumer) {
        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
                for (ConsumerRecord<String, String> record : records) {
                    TopicOffset offset = offsets.stream().filter(x -> x.getPartition() == record.partition()).findAny().orElse(null);
                    if (offset.getStopPos() != null && offset.getStopPos() > 0 && record.offset() > offset.getStopPos()) {
                        offset.setFinished(true);
                        if (offsets.stream().allMatch(x -> x.isFinished())) {
                            System.out.println("Consumer " + name + " " + topic + " finished. Closing.");
                            consumer.close();
                            return;
                        }
                    } else {
                        System.out.println(name + ", " + topic + ": " + record.partition() + ", " + record.offset());
                        connections.get(name).getMessages().add(convertToMessage(record));
                    }
                }
                consumer.commitSync();
                if (connections.get(name) == null) {
                    System.out.println("Connection " + name + " closed --> Consumer " + topic + " closed.");
                    consumer.close();
                    return;
                }
                if (connections.get(name).getConsumers().get(topic).isStop()) {
                    consumer.close();
                    System.out.println("Connection " + name + ", consumer " + topic + " unsubscribed.");
                    return;
                }
            }
        } catch (Exception e) {
            consumer.close();
        }
    }

    private KafkaConsumer<String, String> getConsumer(String name, String topic, String extension) {
        Properties props = new Properties();
        props.put("bootstrap.servers", connections.get(name).getBrokers());
        props.put("group.id", "kafka-viewer_" + System.getenv("USERNAME") + "_" + UUID.randomUUID().toString());
        props.put("enable.auto.commit", "true");
        props.put("auto.commit.interval.ms", "1000");
        props.put("session.timeout.ms", "30000");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        KafkaConsumer<String, String> consumer = null;
        try {
            consumer = new KafkaConsumer(props);
            consumer.subscribe(Collections.singleton(topic));
            return consumer;
        } catch (Exception e) {
            if (consumer != null) {
                consumer.close();
            }
        }
        return consumer;
    }

    private Set<TopicPartition> getPartitions(KafkaConsumer consumer) {
        Set<TopicPartition> partitions;
        while ((partitions = consumer.assignment()).isEmpty()) {
            consumer.poll(Duration.ofMillis(500));
        }
        return partitions;
    }

    private Message convertToMessage(ConsumerRecord<String, String> record) {
        Message message = new Message();
        message.setTopic(record.topic());
        message.setKey(record.key());
        message.setSize(record.value().length());
        message.setOffset(record.offset());
        message.setPartition(record.partition());
        message.setTimestamp(record.timestamp());
        message.setPayload(record.value());
        message.setHeaders(new HashMap<>());
        for (Header header : record.headers()) {
            message.getHeaders().put(header.key(), new String(header.value()));
        }
        return message;
    }

    @Scheduled(fixedDelay = 5000)
    public void exitIfNotInUse() {
        if (lastKeepAlive > 0 && lastKeepAlive < System.currentTimeMillis() - 5000) {
            System.out.println("Existing since not in use.");
            System.exit(0);
        }
    }
}
