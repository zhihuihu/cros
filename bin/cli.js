#!/usr/bin/env node
const { program } = require('commander');
const path = require('path');

// 加载服务端模块
const { TunnelServer } = require('../server/server');
// 加载客户端模块
const { TunnelClient } = require('../client/client');

program
  .name('cros')
  .description('Cross network tunnel tool')
  .version('1.1.0');

program
  .command('server <config>')
  .description('Start tunnel server')
  .action((config) => {
    const configPath = path.resolve(process.cwd(), config);
    new TunnelServer(configPath).start();
  });

program
  .command('client <config>')
  .description('Start tunnel client')
  .action((config) => {
    const configPath = path.resolve(process.cwd(), config);
    new TunnelClient(configPath);
  });

program.parse(process.argv);