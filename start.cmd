cd C:\dev\apps
rmdir /S /Q zookeeper-tmp-data
rmdir /S /Q kafka-logs
start zookeeper-3.4.14\bin\zkServer.cmd
call timeout 10
start cmd.exe /k "kafka_2.11-2.4.0\bin\windows\kafka-server-start.bat kafka_2.11-2.4.0\config\server.properties"
call timeout 10
call kafka_2.11-2.4.0\bin\windows\kafka-topics.bat --create --zookeeper localhost:2181 --replication-factor 1 --partitions 5 --topic TEST_TOPIC_1
call kafka_2.11-2.4.0\bin\windows\kafka-topics.bat --create --zookeeper localhost:2181 --replication-factor 1 --partitions 5 --topic TEST_TOPIC_2
call kafka_2.11-2.4.0\bin\windows\kafka-topics.bat --create --zookeeper localhost:2181 --replication-factor 1 --partitions 5 --topic TEST_TOPIC_3
call kafka_2.11-2.4.0\bin\windows\kafka-topics.bat --create --zookeeper localhost:2181 --replication-factor 1 --partitions 5 --topic TEST_TOPIC_4
call kafka_2.11-2.4.0\bin\windows\kafka-topics.bat --create --zookeeper localhost:2181 --replication-factor 1 --partitions 5 --topic TEST_TOPIC_5
