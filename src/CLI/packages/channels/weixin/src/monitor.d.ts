export interface CdnRef {
    encryptQueryParam: string;
    aesKey: string;
}
export interface FileCdnRef extends CdnRef {
    fileName: string;
}
export declare function getContextToken(_chatId: string): string | undefined;
export declare function startPollLoop(_params: {
    baseUrl: string;
    token: string;
    onMessage: (msg: {
        fromUserId: string;
        text: string;
        refText?: string;
        image?: CdnRef;
        file?: FileCdnRef;
    }) => Promise<void> | void;
    abortSignal: AbortSignal;
}): Promise<void>;
