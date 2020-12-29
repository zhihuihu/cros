const clientConfig = require('./client.json');
const clientHandler = require('./clientHandler');

let clientHandlerIns = new clientHandler(clientConfig);
clientHandlerIns.start();

