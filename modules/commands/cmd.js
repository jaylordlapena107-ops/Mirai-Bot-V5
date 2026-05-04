module.exports.config = {
    name: "cmd",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Mirai Team",
    description: "Manage and control all bot modules",
    commandCategory: "Admin",
    usages: "[load/unload/loadAll/unloadAll/info] [module name]",
    cooldowns: 5,
    prefix: false
};

const loadCommand = function ({ moduleList, threadID, messageID }) {
    const { writeFileSync } = require('fs-extra');
    const { mainPath, api } = global.client;
    const logger = require(mainPath + '/utils/log');
    const errorList = [];
    delete require.cache[require.resolve(process.cwd() + '/config.json')];
    const configValue = require(process.cwd() + '/config.json');

    for (const nameModule of moduleList) {
        if (!nameModule) {
            errorList.push('- Module name is empty');
            continue;
        }
        try {
            const dirModule = __dirname + '/' + nameModule + '.js';
            delete require.cache[require.resolve(dirModule)];
            const command = require(dirModule);
            global.client.commands.delete(nameModule);

            if (!command.config || !command.run || !command.config.commandCategory)
                throw new Error('Invalid module format!');

            global.client['eventRegistered'] = global.client['eventRegistered'].filter(info => info !== command.config.name);

            if (command.config.envConfig && typeof command.config.envConfig === 'object') {
                for (const [key, value] of Object.entries(command.config.envConfig)) {
                    if (!global.configModule[command.config.name]) global.configModule[command.config.name] = {};
                    if (!configValue[command.config.name]) configValue[command.config.name] = {};
                    global.configModule[command.config.name][key] = configValue[command.config.name][key] || value || '';
                    configValue[command.config.name][key] = configValue[command.config.name][key] || value || '';
                }
                logger.loader('Loaded config for ' + command.config.name);
            }

            if (command.onLoad) command.onLoad({ configValue });
            if (command.handleEvent) global.client.eventRegistered.push(command.config.name);

            if (global.config.commandDisabled.includes(nameModule + '.js') || configValue.commandDisabled.includes(nameModule + '.js')) {
                configValue.commandDisabled.splice(configValue.commandDisabled.indexOf(nameModule + '.js'), 1);
                global.config.commandDisabled.splice(global.config.commandDisabled.indexOf(nameModule + '.js'), 1);
            }

            global.client.commands.set(command.config.name, command);
            logger.loader('Loaded command: ' + command.config.name);
        } catch (error) {
            errorList.push(`- ${nameModule}: ${error.message}`);
        }
    }

    if (errorList.length !== 0) {
        api.sendMessage('Modules failed to load:\n' + errorList.join('\n'), threadID, messageID);
    }
    api.sendMessage(`Loaded ${moduleList.length - errorList.length} module(s)`, threadID, messageID);
    writeFileSync(process.cwd() + '/config.json', JSON.stringify(configValue, null, 4), 'utf8');
};

const unloadModule = function ({ moduleList, threadID, messageID }) {
    const { writeFileSync } = require("fs-extra");
    const { mainPath, api } = global.client;
    const logger = require(mainPath + "/utils/log").loader;
    delete require.cache[require.resolve(process.cwd() + '/config.json')];
    const configValue = require(process.cwd() + '/config.json');

    for (const nameModule of moduleList) {
        if (!nameModule) continue;
        global.client.commands.delete(nameModule);
        global.client.eventRegistered = global.client.eventRegistered.filter(item => item !== nameModule);
        configValue["commandDisabled"].push(`${nameModule}.js`);
        global.config["commandDisabled"].push(`${nameModule}.js`);
        logger(`Unloaded command: ${nameModule}`);
    }

    writeFileSync(process.cwd() + '/config.json', JSON.stringify(configValue, null, 4), 'utf8');
    return api.sendMessage(`Unloaded ${moduleList.length} module(s)`, threadID, messageID);
};

module.exports.run = function ({ event, args, api }) {
    const { readdirSync } = require("fs-extra");
    const { threadID, messageID } = event;
    const command = args[0];
    const moduleList = args.slice(1).map(module => module.trim()).filter(Boolean);

    switch (command) {
        case "load":
            if (moduleList.length === 0) return api.sendMessage("Module name cannot be empty!", threadID, messageID);
            return loadCommand({ moduleList, threadID, messageID });
        case "unload":
            if (moduleList.length === 0) return api.sendMessage("Module name cannot be empty!", threadID, messageID);
            return unloadModule({ moduleList, threadID, messageID });
        case "loadall": {
            const all = readdirSync(__dirname).filter(f => f.endsWith(".js") && !f.includes('example')).map(f => f.replace(/\.js$/, ""));
            return loadCommand({ moduleList: all, threadID, messageID });
        }
        case "unloadall": {
            const all = readdirSync(__dirname).filter(f => f.endsWith(".js") && !f.includes('example')).map(f => f.replace(/\.js$/, ""));
            return unloadModule({ moduleList: all, threadID, messageID });
        }
        case "info": {
            const commandName = moduleList.join("") || "";
            const commandInfo = global.client.commands.get(commandName);
            if (!commandInfo) return api.sendMessage("Module not found!", threadID, messageID);
            const { name, version, hasPermssion, credits, cooldowns, dependencies } = commandInfo.config;
            return api.sendMessage(
                `=== ${name.toUpperCase()} ===\n` +
                `- Author: ${credits}\n` +
                `- Version: ${version}\n` +
                `- Permission required: ${hasPermssion === 0 ? "Member" : hasPermssion === 1 ? "Group Admin" : hasPermssion === 2 ? "Bot Admin" : "Bot Owner"}\n` +
                `- Cooldown: ${cooldowns}s\n` +
                `- Required packages: ${(Object.keys(dependencies || {})).join(", ") || "None"}`,
                threadID, messageID
            );
        }
        default:
            return global.utils.throwError(module.exports.config.name, threadID, messageID);
    }
};
