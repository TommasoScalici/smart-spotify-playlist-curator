import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const FUNCTIONS_DIR = path.join(ROOT_DIR, 'functions');
const DIST_DIR = path.join(FUNCTIONS_DIR, 'dist');

// Ensure dist directory exists
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

async function build() {
  console.log('🚀 Starting Esbuild Bundle...');

  try {
    // 1. Bundle Functions + Shared Logic
    await esbuild.build({
      entryPoints: [path.join(FUNCTIONS_DIR, 'src', 'index.ts')],
      outfile: path.join(DIST_DIR, 'index.js'),
      bundle: true,
      platform: 'node',
      target: 'node20', // Cloud Functions Gen 2 (Node 20+)
      format: 'cjs', // CommonJS for standard Firebase Functions
      external: [
        'firebase-admin',
        'firebase-functions',
        '@spotify/web-api-ts-sdk',
        'zod',
        '@google/generative-ai',
        'dotenv'
      ],
      logLevel: 'info',
      sourcemap: 'inline' // Good for debugging in Cloud Console
    });

    console.log('✅ Bundle complete: functions/dist/index.js');

    // 2. Generate clean package.json for deployment
    const originalPackageJson = JSON.parse(
      fs.readFileSync(path.join(FUNCTIONS_DIR, 'package.json'), 'utf-8')
    );

    const deployPackageJson = {
      name: originalPackageJson.name,
      main: 'index.js',
      engines: originalPackageJson.engines,
      type: 'commonjs', // Explicitly state CJS
      dependencies: originalPackageJson.dependencies
    };

    // Remove the workspace dependency before writing
    // We bundled it, so we don't need it in 'node_modules'
    if (deployPackageJson.dependencies['@smart-spotify-curator/shared']) {
      delete deployPackageJson.dependencies['@smart-spotify-curator/shared'];
    }

    fs.writeFileSync(
      path.join(DIST_DIR, 'package.json'),
      JSON.stringify(deployPackageJson, null, 2)
    );

    console.log('✅ Manifest generated: functions/dist/package.json');
    console.log('📦 Build ready for deployment (Secrets Only)!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
