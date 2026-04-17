import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

execSync('npm run generate', {
    stdio: 'inherit',
    cwd: root
});

for (const workspace of [
    'packages/channels/base',
    'packages/channels/telegram',
    'packages/channels/weixin',
    'packages/channels/dingtalk',
    'packages/core',
    'packages/cli'
]) {
    execSync('npm run build', {
        stdio: 'inherit',
        cwd: join(root, workspace)
    });
}
