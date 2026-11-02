import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { resolve } from 'node:path';

const serverDirectory = process.cwd();
const prismaDirectory = resolve(serverDirectory, 'prisma');
const testDatabase = resolve(prismaDirectory, 'test.db');
mkdirSync(prismaDirectory, { recursive: true });
if (!existsSync(testDatabase)) closeSync(openSync(testDatabase, 'a'));

const environment = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./prisma/test.db',
  SESSION_SECRET: 'test-only-secret-never-used-for-hosting-0000000000000000',
};

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: serverDirectory, env: environment, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(['../node_modules/prisma/build/index.js', 'db', 'push', '--schema', 'prisma/schema.prisma']);
run(['prisma/seed.js']);
run(['../node_modules/vitest/vitest.mjs', 'run']);


