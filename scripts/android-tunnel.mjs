import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const isWin = process.platform === 'win32';
const adbName = isWin ? 'adb.exe' : 'adb';

function candidates() {
  const home = process.env.LOCALAPPDATA || process.env.HOME || '';
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    home ? path.join(home, 'Android', 'Sdk') : null,
    home ? path.join(home, 'Android', 'sdk') : null,
  ].filter(Boolean);

  return [
    adbName,
    ...sdkRoots.map((root) => path.join(root, 'platform-tools', adbName)),
  ];
}

function resolveAdb() {
  for (const bin of candidates()) {
    if (bin === adbName) {
      const probe = spawnSync(bin, ['version'], { encoding: 'utf8', shell: isWin });
      if (probe.status === 0) return bin;
      continue;
    }
    if (existsSync(bin)) return bin;
  }
  return null;
}

const adb = resolveAdb();
if (!adb) {
  console.error(
    'adb not found. Install Android platform-tools or add them to PATH.\n' +
      'Typical location: %LOCALAPPDATA%\\Android\\Sdk\\platform-tools',
  );
  process.exit(1);
}

const result = spawnSync(adb, ['reverse', 'tcp:8000', 'tcp:8000'], {
  encoding: 'utf8',
  stdio: 'inherit',
  shell: isWin && adb === adbName,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const listed = spawnSync(adb, ['reverse', '--list'], { encoding: 'utf8' });
if (listed.stdout) process.stdout.write(listed.stdout);
console.log(`USB tunnel ready (${adb}): phone :8000 -> PC :8000`);
