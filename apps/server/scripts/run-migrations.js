"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const umzug_1 = require("umzug");
const database_1 = require("../src/config/database");
const models_1 = require("../src/models");
const runner = new umzug_1.Umzug({
    migrations: {
        glob: path_1.default.resolve(__dirname, '../migrations/*.ts')
    },
    context: database_1.sequelize.getQueryInterface(),
    storage: new umzug_1.SequelizeStorage({ sequelize: database_1.sequelize }),
    logger: console
});
const main = async () => {
    await database_1.sequelize.authenticate();
    (0, models_1.registerAssociations)();
    await runner.up();
    console.log('Migrations executed');
};
main().catch(error => {
    console.error(error);
    process.exit(1);
});
