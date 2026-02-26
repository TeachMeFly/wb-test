import knex, { migrate, seed } from "#postgres/knex.js";
import express, { Express } from "express";
import log4js from "log4js";
import { WildberriesProvider, WarehouseListDBEntity } from "#wb/index.js";
import moment from "moment";
import { WarehouseList, WarehouseNames } from "#postgres/tables.js";
import { CronJob } from "cron";
import env from "#config/env/env.js";
import GoogleSheetsProvider from "#google/sheets_provider.js";

log4js.configure({
    appenders: {
        everything: { type: "stdout" },
        // file_log: { type: 'file', filename: 'anyPath/all-logs.log' },
    },
    categories: {
        default: {
            appenders: ["everything"],
            level: 'all'
        },
    },
});

export class App {
    private logger: log4js.Logger;
    private readonly express: Express;

    private readonly updateDB: CronJob;
    private readonly updateTables: CronJob;

    private readonly WBProvider: WildberriesProvider;
    private readonly googleProvider: GoogleSheetsProvider;

    constructor() {
        this.logger = log4js.getLogger();
        this.express = express();

        this.updateDB = CronJob.from({
            cronTime: env.UPDATE_DB_MASK as string,
            onTick: async () => {
                try {
                    await this.updateDbData();
                    await this.updateTablesData();
                } catch (error) {
                    this.logger.error((error as Error).message);
                }
            },
            start: true,
        });
        this.updateTables = CronJob.from({
            cronTime: env.UPDATE_TABLES_MASK as string,
            onTick: async () => {
                try {
                    await this.updateTablesData();
                } catch (error) {
                    this.logger.error((error as Error).message);
                }
            },
            start: true,
        });
        this.WBProvider = new WildberriesProvider();
        this.googleProvider = new GoogleSheetsProvider();

    }

    private configureHttpServer() {
        this.express.use(express.json());

        this.express.get('/oauth2callback', async (req, res) => {
            await this.googleProvider.auth(req.query.code as string);
            res.send("Authentication successful! Please return to the console.");

        });

        this.express.get('/login', async (req, res) => {
            res.redirect(this.googleProvider.authorizeUrl);
        })

        this.express.get(/tariffs/, async (req, res) => {
            const list = await WarehouseList()
                .join("warehouse_names", "warehouseName_id", "=", "warehouse_names.id")
                .where("warehouse_list.get_date", "=", moment().format("YYYY-MM-DD"))
                .select(knex.ref("warehouse_names.name").as("warehouseName"), "warehouse_list.*");
            res.json(list);
        });

        this.express.get('/list_sheets', async (req, res) => {
            try {
                const sheets = await this.googleProvider.list(GoogleSheetsProvider.SpreadsheetsIds[0]);
                res.json(sheets);
            } catch (error) {
                res.status(403).send((error as Error).message);
            }
        });
    }

    destroy() {
        this.updateDB.stop();
        this.updateTables.stop();
    }

    private async updateTablesData(): Promise<void> {
        const list = await WarehouseList()
            .join("warehouse_names", "warehouseName_id", "=", "warehouse_names.id")
            .where("warehouse_list.get_date", "=", moment().format("YYYY-MM-DD"))
            .select(
                "warehouse_list.boxDeliveryBase",
                "warehouse_list.boxDeliveryCoefExpr",
                "warehouse_list.boxDeliveryLiter",
                "warehouse_list.boxDeliveryMarketplaceBase",
                "warehouse_list.boxDeliveryMarketplaceCoefExpr",
                "warehouse_list.boxDeliveryMarketplaceLiter",
                "warehouse_list.boxStorageBase",
                "warehouse_list.boxStorageCoefExpr",
                "warehouse_list.boxStorageLiter",
                "warehouse_list.geoName",
                knex.ref("warehouse_names.name").as("warehouseName"),
            )
            .orderBy("warehouse_list.boxDeliveryCoefExpr", "DESC");

        const dataArray = Array(list.length + 1);
        dataArray[0] = Object.values(WildberriesProvider.WarehouseNames);
        for (let i = 0; i < list.length; i++) {
            const rowArray = Array(Object.keys(WildberriesProvider.WarehouseNames).length);
            for (let j = 0; j < rowArray.length; j++) {
                rowArray[j] = list[i][Object.keys(WildberriesProvider.WarehouseNames)[j]];
            }
            dataArray[i + 1] = rowArray;
        }

        await Promise.all(GoogleSheetsProvider.SpreadsheetsIds.map((id) => this.googleProvider.updateSheet(id, dataArray)));

        this.logger.info(`Tables was updated successfully.`);
    }

    private async updateDbData(): Promise<void> {
        const data = await this.WBProvider.getBoxTariffs();
        const warehouseNamesArray = data.warehouseList.filter((e, i, arr) => arr.indexOf(e) === i).map((e) => e.warehouseName);

        await WarehouseNames()
            .insert(
                warehouseNamesArray.map((e) => {
                    return {
                        name: e,
                    };
                }),
            )
            .onConflict("name")
            .ignore();

        const names = await WarehouseNames().select("name", "id").whereIn("name", warehouseNamesArray);
        await WarehouseList()
            .select()
            .where("get_date", "=", moment().format("YYYY-MM-DD"))
            .del();
        await WarehouseList().insert(
            data.warehouseList.map((e: Partial<WarehouseListDBEntity>) => {
                e.get_date = moment().format("YYYY-MM-DD");
                e.warehouseName_id = names.find((n) => n.name === e.warehouseName).id;
                delete e.warehouseName;
                return e;
            }),
        );

        this.logger.info(`DB was updated successfully.`);
    }

    async run() {
        try {
            await migrate.latest();
            await seed.run();
            this.logger.info(`All migrations and seeds have been run.`);
        } catch (error) {
            this.logger.error((error as Error).message);
        }

        this.configureHttpServer();

        this.express.listen(env.APP_PORT, () => {
            this.logger.info(`App listening on ${env.APP_PORT}`);
        })
    }
}

await new App().run();
