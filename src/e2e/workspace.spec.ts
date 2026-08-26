import { expect, test, type Page } from '@playwright/test'

/**
 * These journeys need a signed-in session. Supply credentials for a test
 * organization through the environment to run them:
 *
 *   E2E_EMAIL=tester@example.org E2E_PASSWORD=... npx playwright test
 *
 * Without credentials the suite skips rather than reporting a false failure.
 */
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

const signIn = async (page: Page): Promise<void> => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(EMAIL as string)
  await page.getByLabel(/password/i).fill(PASSWORD as string)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/app/, { timeout: 30_000 })
}

test.describe('signed-in workspace', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to run workspace journeys.')

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the dashboard shows headline figures', async ({ page }) => {
    await expect(page.getByText(/total projects/i)).toBeVisible()
    await expect(page.getByText(/beneficiaries reached/i)).toBeVisible()
  })

  test('every primary module opens without error', async ({ page }) => {
    const modules = [
      'projects', 'grants', 'donors', 'beneficiaries', 'mel',
      'finance', 'procurement', 'reports', 'settings',
    ]
    for (const module of modules) {
      await page.goto(`/app/${module}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0)
    }
  })

  test('universal search opens with the keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('ControlOrMeta+k')
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible()
  })

  test('a project can be created and then found by search', async ({ page }) => {
    const code = `E2E-${Date.now()}`
    await page.goto('/app/projects')
    await page.getByRole('button', { name: /new project/i }).click()
    await page.getByLabel(/project title/i).fill('End to end test project')
    await page.getByLabel(/project code/i).fill(code)
    await page.getByLabel(/^sector/i).fill('Education')
    await page.getByRole('button', { name: /create project/i }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })
    await page.getByPlaceholder(/search projects/i).fill(code)
    await expect(page.getByText(code)).toBeVisible({ timeout: 10_000 })
  })

  test('demo data can be loaded and removed again', async ({ page }) => {
    await page.goto('/app/settings/demo')
    await page.getByRole('button', { name: /load demo data/i }).click()
    await expect(page.getByText(/demo mode is active/i)).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: /delete demo data/i }).click()
    await page.getByRole('button', { name: /^delete demo data$/i }).last().click()
    await expect(page.getByText(/demo mode is active/i)).toHaveCount(0, { timeout: 60_000 })
  })

  test('the theme toggle works inside the workspace', async ({ page }) => {
    const root = page.locator('html')
    const before = await root.getAttribute('class')
    await page.getByRole('button', { name: /switch to (light|dark) mode/i }).click()
    await expect(root).not.toHaveClass(before ?? '')
  })
})

test.describe('mobile layout', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to run workspace journeys.')
  test.use({ viewport: { width: 390, height: 844 } })

  test('the bottom navigation is available on a phone', async ({ page }) => {
    await signIn(page)
    await expect(page.locator('nav').last()).toBeVisible()
  })
})
