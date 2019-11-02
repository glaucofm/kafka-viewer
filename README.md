# kafka-viewer

A tool to view and publish messages on Kafka. Currently it only supports JSON messages.

![Screenshot 1](./src/assets/images/screenshot1.png)
![Screenshot 2](./src/assets/images/screenshot2.png)
![Screenshot 3](./src/assets/images/screenshot3.png)
![Screenshot 4](./src/assets/images/screenshot4.png)
![Screenshot 5](./src/assets/images/screenshot5.png)
![Screenshot 6](./src/assets/images/screenshot6.png)

## Initial setup

1) Install nodejs and npm latest version
2) run npm install

PS: This project includes node-rdkafka, which is a wrapper over the C++ librdkafka binary library. Making a successful build of it may require some level of tinkering.  

## Build and execute locally

npm run electron-build

## Generate windows executable

npm run dist

## Notes

- This project includes node-rdkafka, which requires binary compilation and nodejs bindings specific to the nodejs version used. 
- After the bindings are generated on the electron packager command, the nodejs code will no longer run on regular non-electron nodejs.   
