/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as actualFsPromises from 'node:fs/promises';
export declare const mockControl: {
    mockReadFile: import("vitest").Mock<(...args: any[]) => any>;
};
export declare const access: typeof actualFsPromises.access, appendFile: typeof actualFsPromises.appendFile, chmod: typeof actualFsPromises.chmod, chown: typeof actualFsPromises.chown, copyFile: typeof actualFsPromises.copyFile, cp: typeof actualFsPromises.cp, lchmod: typeof actualFsPromises.lchmod, lchown: typeof actualFsPromises.lchown, link: typeof actualFsPromises.link, lstat: typeof actualFsPromises.lstat, mkdir: typeof actualFsPromises.mkdir, open: typeof actualFsPromises.open, opendir: typeof actualFsPromises.opendir, readdir: typeof actualFsPromises.readdir, readlink: typeof actualFsPromises.readlink, realpath: typeof actualFsPromises.realpath, rename: typeof actualFsPromises.rename, rmdir: typeof actualFsPromises.rmdir, rm: typeof actualFsPromises.rm, stat: typeof actualFsPromises.stat, symlink: typeof actualFsPromises.symlink, truncate: typeof actualFsPromises.truncate, unlink: typeof actualFsPromises.unlink, utimes: typeof actualFsPromises.utimes, watch: typeof actualFsPromises.watch, writeFile: typeof actualFsPromises.writeFile;
export declare const readFile: import("vitest").Mock<(...args: any[]) => any>;
