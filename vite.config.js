import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function readCustomEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const source = fs.readFileSync(filePath, 'utf8');
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((env, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex < 0) return env;

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, '');

      if (key) env[key] = value;
      return env;
    }, {});
}

function readCustomEnvFiles(cwd, filenames) {
  return filenames.reduce(
    (env, filename) => ({
      ...env,
      ...readCustomEnvFile(path.resolve(cwd, filename)),
    }),
    {}
  );
}

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const viteEnv = loadEnv(mode, cwd, '');
  const customEnv = readCustomEnvFiles(cwd, ['unirateapi.env', 'logodevapi.env']);
  const mergedEnv = { ...viteEnv, ...customEnv };
  const injectedEnv = Object.fromEntries(
    Object.entries(mergedEnv)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
  );

  return {
    plugins: [react()],
    define: injectedEnv,
    server: {
      port: 5173,
      open: true,
    },
  };
});
