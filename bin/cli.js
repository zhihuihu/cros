#!/usr/bin/env node
const commander = require('commander');
const inquirer = require('inquirer');       //命令行答询
const ora = require('ora');         //命令行中加载状态标识
const chalk = require('chalk');     //命令行输出字符颜色
const fs = require('fs');
const path = require("path");
const serverHandler = require('../server/serverHandler');
const clientHandler = require('../client/clientHandler');
const projectPackage = require('../package.json');

// 工具版本号
commander.version(projectPackage.version);

commander
  .command('server <configPath>')
  .description('start the cros server')
  .action(function (configPath) {
    let serverConfig;
    if(path.isAbsolute(configPath)){
      if(!fs.existsSync(configPath)){
        console.log(chalk.red(`[cros] The configuration file does not exist`));
        return 0;
      }
      serverConfig = JSON.parse(fs.readFileSync(configPath).toString());
    }else{
      let truePath = path.resolve('./', configPath);
      if(!fs.existsSync(truePath)){
        console.log(chalk.red(`[cros] The configuration file does not exist`));
        return 0;
      }
      serverConfig = JSON.parse(fs.readFileSync(truePath).toString());
    }
    let serverHandlerIns = new serverHandler(serverConfig);
    serverHandlerIns.start();
  });

commander
  .command('client <configPath>')
  .description('start the cros client')
  .action(function (configPath) {
    let serverConfig;
    if(path.isAbsolute(configPath)){
      if(!fs.existsSync(configPath)){
        console.log(chalk.red(`[cros] The configuration file does not exist`));
        return 0;
      }
      serverConfig = JSON.parse(fs.readFileSync(configPath).toString());
    }else{
      let truePath = path.resolve('./', configPath);
      if(!fs.existsSync(truePath)){
        console.log(chalk.red(`[cros] The configuration file does not exist`));
        return 0;
      }
      serverConfig = JSON.parse(fs.readFileSync(truePath).toString());
    }
    let clientHandlerIns = new clientHandler(serverConfig);
    clientHandlerIns.start();
  });

commander.parse(process.argv);
