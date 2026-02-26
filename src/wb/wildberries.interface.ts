export interface IWarehouseListDBCommonFields {
    id: number;
    created_at: string;
    updated_at: string;
    get_date: string;
}

export interface IWarehouseList {
    "boxDeliveryBase": string;
    "boxDeliveryCoefExpr": string;
    "boxDeliveryLiter": string;
    "boxDeliveryMarketplaceBase": string;
    "boxDeliveryMarketplaceCoefExpr": string;
    "boxDeliveryMarketplaceLiter": string;
    "boxStorageBase": string;
    "boxStorageCoefExpr": string;
    "boxStorageLiter": string;
    "geoName": string;
    "warehouseName": string;
    warehouseName_id?: number;
}

export interface IWildberriesTariffsBox {
    dtNextBox: string;
    dtTillMax: string;
    warehouseList: IWarehouseList[];
}

export type WarehouseListDBEntity = IWarehouseListDBCommonFields & IWarehouseList;
