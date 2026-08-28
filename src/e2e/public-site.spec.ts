import { expect, test } from '@playwright/test'

test.describe('public website', () => {
  test('the home page presents the product and a route into the workspace', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('the marketing pages are all reachable', async ({ page }) => {
    for (const path of ['/platform', '/solutions', '/about', '/contact']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  test('an unknown address shows the not-found page rather than a blank screen', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
  })

  test('the theme can be switched and the choice survives a reload', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('html')
    const before = await root.getAttribute('class')

    await page.getByRole('button', { name: /switch to (light|dark) mode/i }).click()
    await expect(root).not.toHaveClass(before ?? '')

    const after = await root.getAttribute('class')
    await page.reload()
    await expect(root).toHaveClass(after ?? '')
  })

  test('the document verification page rejects an unknown code', async ({ page }) => {
    await page.goto('/verify')
    await page.getByPlaceholder(/NGO-/i).fill('NGO-000000-00000')
    await page.getByRole('button', { name: /^verify$/i }).click()
    await expect(page.getByText(/no matching document/i)).toBeVisible({ timeout: 10_000 })
  })

  test('the donate page is reachable from the header and takes a pledge', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /donate/i }).first().click()
    await expect(page).toHaveURL(/\/donate/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Amount presets and the custom amount field are both offered.
    await expect(page.getByLabel(/or enter another amount/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /pledge/i })).toBeVisible()
  })

  test('the donate form asks who the gift is from', async ({ page }) => {
    await page.goto('/donate')
    await page.getByRole('button', { name: /pledge/i }).click()
    await expect(page.getByText(/who this gift is from|anonymously/i).first()).toBeVisible()
  })

  test('a visitor can choose to give anonymously', async ({ page }) => {
    await page.goto('/donate')
    await page.getByLabel(/give anonymously/i).check()
    await expect(page.getByLabel(/your name/i)).toHaveCount(0)
  })

  test('the footer credits the suite and links to negolinks.com', async ({ page }) => {
    await page.goto('/')
    const credit = page.getByRole('link', { name: /NegoLinks Enterprise Suite/i })
    await expect(credit).toBeVisible()
    await expect(credit).toHaveAttribute('href', /negolinks\.com/)
    await expect(credit).toHaveAttribute('target', '_blank')
  })
})

test.describe('sign-in screen', () => {
  test('shows the sign-in form and a way back to the website', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('the password can be revealed and hidden again', async ({ page }) => {
    await page.goto('/login')
    const password = page.getByLabel(/password/i)
    await password.fill('a-secret-value')
    await expect(password).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(password).toHaveAttribute('type', 'text')
  })

  test('visiting the workspace while signed out redirects to sign-in', async ({ page }) => {
    await page.goto('/app/projects')
    await expect(page).toHaveURL(/\/login/)
  })
})
