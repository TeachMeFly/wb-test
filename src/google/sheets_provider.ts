import { google, Auth, sheets_v4 } from "googleapis";
import env from "#config/env/env.js";

const SpreadsheetsIds = [...new Intl.Segmenter([], { granularity: "word" }).segment(env.SHEETS as string)]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);

export default class GoogleSheetsProvider {
    private readonly client: Auth.OAuth2Client;
    private readonly scopes: string[];
    private readonly sheets: sheets_v4.Sheets;

    private get defaultRange(): string {
        return this.sheetTitle + "!A1:Z15000";
    }
    private readonly sheetTitle: string;

    public static get SpreadsheetsIds(): string[] {
        return SpreadsheetsIds;
    }

    private get isReady(): boolean {
        return !!this.client.credentials.access_token;
    }

    public get authorizeUrl(): string {
        return this.client.generateAuthUrl({
            access_type: "offline",
            scope: this.scopes,
        });
    }

    constructor(sheetTitle: string = "stocks_coefs") {
        this.client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID as string, env.GOOGLE_CLIENT_SECRET as string, env.GOOGLE_REDIRECT_URL as string);
        this.scopes = ["https://www.googleapis.com/auth/spreadsheets"];
        this.sheets = google.sheets("v4");
        this.sheetTitle = sheetTitle;
    }

    public async auth(token: string): Promise<void> {
        const tokens = await this.client.getToken(token);
        this.client.credentials = tokens.tokens;
    }

    public async list(id: string, range?: string): Promise<string[][]> {
        if (!this.isReady) {
            throw new Error(`Please authorize before. http://localhost:${env.APP_PORT}/login`);
        }
        if (!range) {
            range = this.defaultRange;
        }
        const res = await this.sheets.spreadsheets.values.get({
            spreadsheetId: id,
            auth: this.client,
            range,
        });

        return res.data.values as string[][];
    }

    public async updateSheet(id: string, data: unknown[][], range?: string): Promise<void> {
        if (!this.isReady) {
            throw new Error(`Please authorize before. http://localhost:${env.APP_PORT}/login`);
        }
        if (!range) {
            range = this.defaultRange;
        }
        try {
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: id,
                auth: this.client,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: this.sheetTitle,
                                },
                            },
                        },
                    ],
                },
            });
        } catch (err) {
        }

        await this.sheets.spreadsheets.values.update({
            spreadsheetId: id,
            auth: this.client,
            range,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: data,
            }
        });
    }
}
