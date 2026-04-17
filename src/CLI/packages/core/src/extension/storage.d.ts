export declare class ExtensionStorage {
    private readonly extensionName;
    constructor(extensionName: string);
    getExtensionDir(): string;
    getConfigPath(): string;
    getEnvFilePath(): string;
    static getUserExtensionsDir(): string;
    static createTmpDir(): Promise<string>;
}
