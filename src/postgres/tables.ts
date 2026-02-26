import knex from "#postgres/knex.js";

export const WarehouseNames = () => knex("warehouse_names");
export const WarehouseList = () => knex("warehouse_list");
