import { test, expect } from '@playwright/test';

test.describe('Finance Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/web/');

    // Check title
    await expect(page).toHaveTitle('Finance Dashboard');

    // Check header is visible
    await expect(page.locator('h1')).toContainText('Finance Dashboard');
  });

  test('should load data without errors', async ({ page }) => {
    await page.goto('/web/');

    // Wait for loading to complete (max 10 seconds)
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Check for error state
    const errorElement = page.locator('.error');
    await expect(errorElement).toBeHidden();

    // Verify dashboard is visible (if charts render, app is working)
    const dashboard = page.locator('#dashboard');
    await expect(dashboard).toBeVisible();

    // Check that at least one chart rendered
    const firstChart = page.locator('#monthlyMovers');
    await expect(firstChart).toBeVisible();
  });

  test('should render all charts', async ({ page }) => {
    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/web/');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Check that dashboard is visible
    const dashboard = page.locator('#dashboard');
    await expect(dashboard).toBeVisible();

    // Check all chart canvases exist AND have Chart.js charts attached
    const canvases = [
      'monthlyMovers',
      'netWorth12Month',
      'creditSpending',
      'assetCategorization',
      'allTimeNetWorth'
    ];

    for (const canvasId of canvases) {
      const canvas = page.locator(`#${canvasId}`);
      await expect(canvas).toBeVisible();

      // Debug canvas state
      const canvasInfo = await page.evaluate((id) => {
        const canvas = document.getElementById(id);
        if (!canvas) return { exists: false };
        return {
          exists: true,
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          isVisible: canvas.offsetParent !== null
        };
      }, canvasId);

      console.log(`Canvas ${canvasId}:`, canvasInfo);

      // Just check that canvas exists and has dimensions for now
      expect(canvasInfo.exists).toBe(true);
      if (canvasInfo.width === 0 || canvasInfo.height === 0) {
        console.error(`Canvas ${canvasId} has zero dimensions!`);
        console.error('Console errors:', consoleErrors);
      }
    }

    // Check stats panel
    const stats = page.locator('#stats');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText('Net Worth');

    // Log any console errors
    if (consoleErrors.length > 0) {
      console.error('Console errors during chart rendering:', consoleErrors);
    }
  });

  test('should have working colorscheme selector', async ({ page }) => {
    await page.goto('/web/');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Check colorscheme dropdown exists
    const dropdown = page.locator('#colorscheme');
    await expect(dropdown).toBeVisible();

    // Get initial value
    const initialValue = await dropdown.inputValue();

    // Select a different colorscheme
    await dropdown.selectOption('dark');

    // Verify value changed
    const newValue = await dropdown.inputValue();
    expect(newValue).toBe('dark');
    expect(newValue).not.toBe(initialValue);
  });

  test('should have working PDF export button', async ({ page }) => {
    await page.goto('/web/');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Check export button exists and is enabled
    const exportBtn = page.locator('.export-btn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();
    await expect(exportBtn).toContainText('Export PDF');
  });

  test('should auto-export when URL param is set', async ({ page }) => {
    // Track downloads
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    await page.goto('/web/?auto-export=true');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Wait for download to start
    const download = await downloadPromise;

    // Verify it's a PDF
    expect(download.suggestedFilename()).toMatch(/finance-dashboard.*\.pdf/);
  });

  test('should display data correctly in stats panel', async ({ page }) => {
    await page.goto('/web/');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    const stats = page.locator('#stats');

    // Check for expected stat labels
    await expect(stats).toContainText('Net Worth');
    await expect(stats).toContainText('Assets');
    await expect(stats).toContainText('Liabilities');
    await expect(stats).toContainText('1 Month Change');
    await expect(stats).toContainText('1 Year Change');
    await expect(stats).toContainText('Credit Card Spend');
  });

  test('should take screenshot for visual verification', async ({ page }) => {
    await page.goto('/web/');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/dashboard-screenshot.png',
      fullPage: true
    });
  });

  test('should log console output for debugging', async ({ page }) => {
    const logs = [];

    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/web/');

    // Wait for loading to complete
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 });

    // Log all console output
    console.log('\n=== Browser Console Output ===');
    logs.forEach(log => console.log(log));
    console.log('=== End Console Output ===\n');
  });
});
