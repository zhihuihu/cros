const getTimestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const log = {
  info: (prefix, ...args) => {
    console.log(`[${getTimestamp()}] [${prefix}]`, ...args);
  },
  error: (prefix, ...args) => {
    console.error(`[${getTimestamp()}] [${prefix}]`, ...args);
  }
};

module.exports = log;