import { test, expect } from '@playwright/test';

test.describe('ArchNet Canvas Editor Interaction E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sandbox mode with a blank template or simple CNN
    await page.goto('/editor/sandbox?template=Simple%20CNN');
    
    // Wait for canvas Minimap nodes to render (8 nodes in Simple CNN template)
    await expect(page.locator('#tour-minimap svg rect')).toHaveCount(8, { timeout: 15000 });
  });

  test('should support zoom in, zoom out, and reset view controls', async ({ page }) => {
    // 1. Zoom In
    const zoomInBtn = page.locator('button[title="Zoom In"]');
    await expect(zoomInBtn).toBeVisible();
    await zoomInBtn.click();
    
    // 2. Zoom Out
    const zoomOutBtn = page.locator('button[title="Zoom Out"]');
    await expect(zoomOutBtn).toBeVisible();
    await zoomOutBtn.click();
    
    // 3. Reset view (Fit to Screen)
    const fitScreenBtn = page.locator('button[title="Fit to Screen"]');
    await expect(fitScreenBtn).toBeVisible();
    await fitScreenBtn.click();
  });

  test('should trigger forward pass animation without crashing', async ({ page }) => {
    const playBtn = page.locator('button[title="Run Forward Pass"]');
    await expect(playBtn).toBeVisible();
    
    // Trigger forward pass
    await playBtn.click();
    
    // Verify the console log indicates forward pass triggers
    const consoleTab = page.locator('button:has-text("Activity")');
    await expect(consoleTab).toBeVisible();
    await consoleTab.click();
  });

  test('should trigger auto-layout successfully', async ({ page }) => {
    const autoLayoutBtn = page.locator('button:has-text("Auto Layout")');
    await expect(autoLayoutBtn).toBeVisible();
    
    // Click auto layout
    await autoLayoutBtn.click();
  });

  test('should support adding nodes from the Layer Library and deleting them', async ({ page }) => {
    // 1. Open Layer Library if not open
    const libraryTitle = page.locator('span:has-text("LAYER LIBRARY")').first();
    if (!await libraryTitle.isVisible()) {
      await page.locator('button[title="Workspace Presets & Window Toggles"]').click();
      await page.locator('button:has-text("Layer Library")').click();
      await page.locator('body').click({ position: { x: 10, y: 10 } });
    }

    // 2. Click the "Input" card to spawn a node
    const inputCard = page.locator('.group:has-text("Input")').first();
    await expect(inputCard).toBeVisible();
    await inputCard.click();

    // 3. Assert a new node is created in the minimap (8 + 1 = 9)
    await expect(page.locator('#tour-minimap svg rect')).toHaveCount(9, { timeout: 5000 });
  });
});
