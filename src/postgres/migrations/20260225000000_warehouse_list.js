import moment from "moment";

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    return knex.schema
        .createTable("warehouse_names", (table) => {
            table.increments("id").primary().unique();
            table.timestamp("created_at").defaultTo(knex.fn.now());
            table.string("name").index().unique();
        })
        .createTable("warehouse_list", (table) => {
            table.increments("id").primary().unique();
            table.date("get_date").index();
            table.string("boxDeliveryBase");
            table.string("boxDeliveryCoefExpr");
            table.string("boxDeliveryLiter");
            table.string("boxDeliveryMarketplaceBase");
            table.string("boxDeliveryMarketplaceCoefExpr");
            table.string("boxDeliveryMarketplaceLiter");
            table.string("boxStorageBase");
            table.string("boxStorageCoefExpr");
            table.string("boxStorageLiter");
            table.string("geoName");
            table.integer("warehouseName_id")
                .index()
                .references("id")
                .inTable("warehouse_names");

            table.index(["warehouseName_id", "get_date"]);
        });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema
        .dropTableIfExists("warehouse_names")
        .dropTableIfExists("warehouse_list");
}
