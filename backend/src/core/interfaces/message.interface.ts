interface MessageBulkInsertInterface {
    campaignId: number;
    recipient: string;
    params: {[key: string]: string};
}

interface TestHydrationResult {
    records: MessageBulkInsertInterface[];
    hydratedRecord: string;
}