const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const projectDir = path.resolve(__dirname, '..');
  const dev = spawn('npm.cmd', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: projectDir,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  const shutdown = () => {
    if (!dev.killed) {
      dev.kill('SIGTERM');
    }
  };

  let ready = false;
  dev.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    if (!ready && text.includes('Local')) {
      ready = true;
      analyze().catch((error) => {
        console.error('Analysis failed:', error);
        shutdown();
        process.exit(1);
      }).then(() => {
        shutdown();
      });
    }
  });
  dev.stderr.on('data', (chunk) => process.stderr.write(chunk));
  dev.on('exit', (code) => {
    if (!ready) {
      console.error('Dev server exited before becoming ready');
      process.exit(code || 1);
    }
  });

  async function analyze() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      consoleMessages.push({ type: 'error', text: err.message });
    });

    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle2' });
    console.log('--- Browser console log ---');
    if (consoleMessages.length === 0) {
      console.log('(no messages)');
    }
    for (const entry of consoleMessages) {
      console.log(`[${entry.type}] ${entry.text}`);
    }
    await browser.close();
  }
})();
