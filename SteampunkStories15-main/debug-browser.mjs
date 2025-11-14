/**
 * Browser Debug Script
 * Öffnet einen Browser mit DevTools für Live-Debugging
 */

import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();

  // Alle console-Nachrichten loggen
  page.on('console', (msg) => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Alle Netzwerk-Fehler loggen
  page.on('error', (err) => {
    console.error('[PAGE ERROR]', err);
  });

  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err);
  });

  // Zur Seite navigieren
  console.log('Navigiere zu http://localhost:3002...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });

  console.log('Browser geöffnet mit DevTools. Drücke Strg+C zum Beenden.');

  // Browser offen lassen
  await new Promise(() => {});
})();
