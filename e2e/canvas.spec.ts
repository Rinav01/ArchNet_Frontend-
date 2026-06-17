import { test, expect } from '@playwright/test';

test.describe('ArchNet Sandbox Feature Gating E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor/sandbox?template=Simple%20CNN');
    
    // Wait for the visual graph template to finish loading
    await expect(page.locator('#tour-minimap svg rect')).toHaveCount(8, { timeout: 15000 });
    
    // Only toggle the Layer Library if it's not already open
    const libraryTitle = page.locator('span:has-text("LAYER LIBRARY")').first();
    if (!await libraryTitle.isVisible()) {
      await page.locator('button[title="Workspace Presets & Window Toggles"]').click();
      await page.locator('button:has-text("Layer Library")').click();
      // Close the dropdown menu by clicking the body backdrop
      await page.locator('body').click({ position: { x: 10, y: 10 } });
    }
  });

  test('should open LoginPromoModal when clicking the gated Vertex AI compute toggle', async ({ page }) => {
    // 1. Locate and click on the "Training Telemetry" console tab to reveal settings
    const trainingTab = page.locator('text=Training Telemetry');
    await trainingTab.click();

    // 2. Locate and click on the "Vertex AI (GPU)" button
    const vertexBtn = page.locator('text=Vertex AI (GPU)');
    await expect(vertexBtn).toBeVisible();
    await vertexBtn.click();

    // 3. Assert that the LoginPromoModal appears
    const promoModal = page.locator('text=Unlock Cloud-Scale AI Design');
    await expect(promoModal).toBeVisible();

    // 4. Close the modal by clicking "Keep exploring local"
    const closeBtn = page.locator('text=Keep exploring local');
    await closeBtn.click();
    await expect(promoModal).not.toBeVisible();
  });

  test('should gate premium templates in the Layer Library', async ({ page }) => {
    // 1. Find the premium template "Mini-GPT" in the Layer Library
    const gptTemplate = page.locator('text=Mini-GPT');
    await expect(gptTemplate).toBeVisible();

    // 2. Click the card
    await gptTemplate.click();

    // 3. Verify the LoginPromoModal opens with a warning about premium models
    const promoModal = page.locator('text=Unlock Cloud-Scale AI Design');
    await expect(promoModal).toBeVisible();
    await expect(page.locator('text=Mini-GPT template is an advanced production-grade architecture')).toBeVisible();
  });

  test('should gate export button in the header', async ({ page }) => {
    // 1. Locate the Export button in the workspace toolbar
    const exportBtn = page.locator('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();

    // 2. Click the Export button
    await exportBtn.click();

    // 3. Verify the LoginPromoModal opens
    const promoModal = page.locator('text=Unlock Cloud-Scale AI Design');
    await expect(promoModal).toBeVisible();
    await expect(page.locator('text=Exporting compiled scripts (PyTorch, TensorFlow, Flax) or ONNX representations')).toBeVisible();
  });

  test('should add a standard layer locally and print output to Console Activity log', async ({ page }) => {
    // 1. Locate the "Input" layer card in the library
    const inputCard = page.locator('.group:has-text("Input")').first();
    await expect(inputCard).toBeVisible();

    // 2. Click the card to spawn a node
    await inputCard.click();

    // 3. Check the Activity logs in the bottom console panel
    const consoleActivityLog = page.locator('text=Offline Sandbox: Created temporary local layer INPUT_');
    await expect(consoleActivityLog).toBeVisible();
  });
});
