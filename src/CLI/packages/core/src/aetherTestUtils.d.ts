export interface TmpTreeObject {
    [name: string]: TmpTreeNode;
}
export type TmpTreeNode = string | string[] | TmpTreeObject | null;
export declare function createTmpDir(treeOrOptions?: TmpTreeObject | {
    prefix?: string;
    parent?: string;
}): Promise<string>;
export declare function cleanupTmpDir(dirPath: string): Promise<void>;
