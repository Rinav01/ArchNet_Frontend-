import { test, expect } from '@playwright/test';

test.describe('ArchNet Onboarding Hero CNN Template E2E Test', () => {
  test('should load the sandbox editor and render the pre-loaded hero CNN', async ({ page }) => {
    // Navigate to local sandbox route directly without query params
    await page.goto('/editor/sandbox');

    // 1. Verify "Welcome to Sandbox Mode" banner is visible
    const welcomeBanner = page.locator('text=Welcome to Sandbox Mode');
    await expect(welcomeBanner).toBeVisible({ timeout: 15000 });

    // 2. Verify that the visual Konva Canvas stage is visible
    const canvasStage = page.locator('.konvajs-content');
    await expect(canvasStage).toBeVisible();

    // 3. Verify that the Minimap container is visible
    const minimap = page.locator('#tour-minimap');
    await expect(minimap).toBeVisible();

    // 4. Assert that the hero CNN template loaded has nodes (node count > 5)
    // The minimap draws a <rect> for each active node, plus one viewport bounding box <rect>
    const nodeRects = page.locator('#tour-minimap svg rect');
    await expect(nodeRects).toHaveCount(8, { timeout: 15000 });

    // 5. Verify that the Real-Time Code side panel is open by default
    const codePreview = page.locator('#codePreview').first();
    await expect(codePreview).toBeVisible();
  });
});
