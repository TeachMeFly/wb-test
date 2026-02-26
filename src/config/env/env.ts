import { z } from 'zod';
import { parseEnv } from 'util';
import { readFileSync } from 'fs';
import { join } from "path";

const envSchema = z.object({
    NODE_ENV: z.union([z.undefined(), z.enum(["development", "production"])]),
    POSTGRES_HOST: z.union([z.undefined(), z.string()]),
    POSTGRES_PORT: z
        .string()
        .regex(/^[0-9]+$/)
        .transform((value) => parseInt(value)),
    POSTGRES_DB: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    APP_PORT: z.union([
        z.undefined(),
        z
            .string()
            .regex(/^[0-9]+$/)
            .transform((value) => parseInt(value)),
    ]),
    WB_HEADER_API_KEY: z.string(),
    UPDATE_DB_MASK: z.string(),
    UPDATE_TABLES_MASK: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URL: z.string(),
    SHEETS: z.string(),
});

function generateEnv(): {[key: string]: string | number | undefined} {
    let dotEnvData;
    try {
        dotEnvData = parseEnv(readFileSync(join(process.cwd(), ".env"), {encoding: "utf8"})) as NodeJS.ProcessEnv;
    } catch (e) {
        dotEnvData = {};
    }

    Object.assign(dotEnvData, process.env);

    return envSchema.parse(dotEnvData);
}

const env = generateEnv();
export default env;
