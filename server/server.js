const serverHandler = require('./serverHandler');
const serverConfig = require('./server.json');

let serverHandlerIns = new serverHandler(serverConfig);
serverHandlerIns.start();
