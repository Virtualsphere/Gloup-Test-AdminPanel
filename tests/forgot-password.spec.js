import { test, expect } from '@playwright/test'

// Runs against the REAL backend — whichever one VITE_API_BASE_URL in .env.local
// points at (UAT). Every run sends a real reset email to the admin mailbox.

const SUCCESS_MESSAGE =
  'A password reset link has been sent to the admin email. It expires in 30 minutes.'

test('Forgot password asks the backend to email a reset link', async ({ page }) => {
  // 1. Open the login page.
  await page.goto('/auth')
  const forgotButton = page.getByRole('button', { name: 'Forgot password?' })
  await expect(forgotButton).toBeVisible()

  // 2. Click the button and wait for the server's real answer.
  //    Start waiting *before* the click, so a fast response can't be missed.
  const responsePromise = page.waitForResponse('**/admin/auth/forgot-password')
  await forgotButton.click()
  const response = await responsePromise

  // 3. What the page sent: a POST with no email in it
  //    (the panel has one admin account shared by several people).
  const request = response.request()
  expect(request.method()).toBe('POST')
  expect(request.postDataJSON()).toEqual({})

  // 4. What the server answered: 200 means it accepted the request and sent the email.
  //    The second argument is printed if the check fails, so you see the server's error.
  expect(response.status(), await response.text()).toBe(200)

  // 5. The page tells the user, and the button is ready to use again.
  await expect(page.getByText(SUCCESS_MESSAGE)).toBeVisible()
  await expect(forgotButton).toBeEnabled()
})
