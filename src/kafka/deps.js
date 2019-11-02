
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function getDependencies(module, modules) {
    let result = (await exec('npm view ' + module + ' dependencies')).stdout;
    result = result.replace(/\n/g, '').replace(/[{}' ^~]/g, '')
    if (!result) {
        return;
    }
    for (let dependency of result.split(",")) {
        dependency = dependency.replace(/:.*/g, '');
        console.log(dependency);
        if (modules.indexOf(dependency) === -1) {
            modules.push(dependency);
            getDependencies(dependency, modules)
        }
    }
}

async function run() {
    // getDependencies('node-rdkafka', []);
    // getDependencies('kafka-node', []);
    // getDependencies('util', []);
    getDependencies('process-nextick-args', []);
}

run();


