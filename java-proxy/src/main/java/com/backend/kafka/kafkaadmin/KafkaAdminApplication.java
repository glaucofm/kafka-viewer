package com.backend.kafka.kafkaadmin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@SpringBootApplication
public class KafkaAdminApplication {

	public static void main(String[] args) {
		SpringApplication.run(KafkaAdminApplication.class, args);
	}

}
