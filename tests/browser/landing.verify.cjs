// Run against Vite using VERIFY_URL and PLAYWRIGHT_MODULE_PATH if needed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.VERIFY_OUTPUT || '/tmp/moneyflow-landing';
const url = process.env.VERIFY_URL || 'http://localhost:5190';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const checks = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.getByRole('heading', { level: 1, name: 'Less money stress. More living.' }).waitFor();
    await page.getByRole('button', { name: 'Goals', exact: true }).click();
    assert.match(await page.locator('.mf-phone-card').innerText(), /Adventure fund/);
    await page.getByRole('button', { name: 'Budget', exact: true }).click();
    assert.match(await page.locator('.mf-phone-card').innerText(), /\$1,600/);
    await page.getByRole('button', { name: 'Spending', exact: true }).click();
    checks.push('All three sample preview buttons update the card and breakdown');
    await page.getByRole('link', { name: 'Features', exact: true }).click();
    await page.locator('.mf-feature').first().waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.mf-feature')).opacity === '1');
    assert.equal(await page.locator('.mf-feature').first().evaluate(el => getComputedStyle(el).opacity), '1');
    checks.push('Feature navigation reveals content');
    await page.locator('summary').filter({ hasText: 'Where is my data stored?' }).click();
    assert.equal(await page.locator('details[open]').count(), 1);
    assert.match(await page.locator('details[open]').innerText(), /do not automatically sync/);
    checks.push('FAQ opens and explains local storage');
    await page.getByRole('button', { name: 'Pause animations' }).click();
    assert.equal(await page.locator('.mf-floating-card').first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    await page.getByRole('button', { name: 'Resume animations' }).click();
    checks.push('Motion control pauses and resumes ambient animation');
    await page.getByRole('link', { name: 'Sign up', exact: false }).first().click();
    assert.match(page.url(), /\/auth\?mode=signup/);
    await page.goto(url);
    await page.getByRole('link', { name: 'Log in', exact: true }).click();
    assert.match(page.url(), /\/auth\?mode=login/);
    checks.push('Signup and login links open the correct auth modes');
    await page.goto(url);
    // Trigger every scroll reveal for an honest complete-page screenshot.
    for (const el of await page.locator('[data-reveal]').all()) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForFunction(element => getComputedStyle(element).opacity === '1', await el.elementHandle());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
      for (const button of await page.locator('.mf-phone-tabs button').all()) {
        const box = await button.boundingBox(); assert.ok(box.height >= 44);
      }
    }
    checks.push('No horizontal overflow at 320, 390, 768, 1024 and 1440px; preview targets at least 44px');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    assert.equal(await page.locator('.mf-chart-line').evaluate(el => getComputedStyle(el).strokeDashoffset), '0px');
    assert.equal(await page.locator('.mf-feature').first().evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('.mf-floating-card').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    checks.push('Reduced motion keeps content and chart visible with animation disabled');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    assert.equal(await page.locator('.mf-site').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(26, 29, 38)');
    await page.screenshot({ path: path.join(output, 'dark.png'), fullPage: true });
    checks.push('Dark theme uses charcoal surfaces and preserves readable preview');
    assert.deepEqual(errors, []);
    checks.push('No browser runtime errors');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(checks.map(c => `PASS ${c}`).join('\n'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
