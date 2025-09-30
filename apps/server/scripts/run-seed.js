"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/config/database");
const models_1 = require("../src/models");
const demoSeed_1 = require("../seeders/demoSeed");
const main = async () => {
    await database_1.sequelize.authenticate();
    (0, models_1.registerAssociations)();
    await (0, demoSeed_1.runDemoSeed)();
    console.log('Seed completed');
};
main().catch(error => {
    console.error(error);
    process.exit(1);
});
