import axios from "axios";
import env from "#config/env/env.js";
import moment from "moment";
import { IWildberriesTariffsBox } from "#wb/wildberries.interface.js";
import { readFileSync } from "fs";
import { join } from "path";

const WarehouseNames = JSON.parse(readFileSync(join(process.cwd(), "fieldNames.json"), "utf8"));

export class WildberriesProvider {
    private readonly endpoint = "https://common-api.wildberries.ru/api/v1/tariffs/box";

    public static get WarehouseNames(): {[key: string]: string} {
        return WarehouseNames;
    }

    public async getBoxTariffs(date?: string): Promise<IWildberriesTariffsBox> {
        if (!date) {
            date = moment().format("YYYY-MM-DD");
        }
        const { data } = await axios.get(this.endpoint, {
            headers: {
                "Authorization": env.WB_HEADER_API_KEY,
            },
            params: { date },
        });
        return data.response.data;
    }
}
