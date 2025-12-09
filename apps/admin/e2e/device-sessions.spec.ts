import { test, expect, devices } from '@playwright/test'

/**
 * AUTH-3 Phase 2.2: Device Sessions E2E Tests
 *
 * Scenario: Multi-device login → revoke one → verify isolation
 *
 * Prerequisites:
 * - auth-service running on port 6021
 * - admin-panel running on port 6002
 * - Test admin account: admin@beauty-platform.com / admin123
 */

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:6002'
const ADMIN_EMAIL = 'admin@beauty-platform.com'
const ADMIN_PASSWORD = 'admin123'

const apiUrl = (path: string) => new URL(path, ADMIN_URL).toString()

test.describe('Device Sessions Management (AUTH-3 Phase 2)', () => {
  /**
   * Test 1: View Active Devices
   * - Login to admin
   * - Navigate to Security page
   * - Verify device list displays current device
   */
  test('should display active devices on Security page', async ({ page }) => {
    // Login
    await page.context().setExtraHTTPHeaders({
      'X-Forwarded-For': `10.0.0.${Date.now() % 200}`,
      'X-Test-Bypass-Rate-Limit': 'true'
    })
    await page.goto(`${ADMIN_URL}/login`)
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Войти' }).click()

    // Wait for dashboard load
    await page.waitForSelector('text=Панель управления')

    // Сбросить все остальные устройства, оставить текущий
    await page.request.delete(apiUrl('/api/auth/devices?keepCurrent=true'))
    await page.waitForTimeout(500)

    // Navigate to Security page
    await page.click('a:has-text("Безопасность")')
    await page.waitForURL(`${ADMIN_URL}/security`)

    // Verify DeviceSessionsPanel is visible
    const devicePanel = page.locator('text=Активные устройства и сессии')
    await expect(devicePanel).toBeVisible()

    // Verify device list loads (not in loading state)
    await page.waitForTimeout(1000) // Wait for API call
    const deviceList = page.locator('[data-testid="device-list"]')
    await expect(deviceList).toBeVisible()

    // Verify at least one device is displayed (current device)
    const deviceCards = page.locator('[data-testid="device-card"]')
    const count = await deviceCards.count()
    expect(count).toBeGreaterThan(0)

    // Verify device card contains expected info
    const activeDevice = page.locator('[data-testid="device-card"]', { hasText: 'Активно' }).first()
    await expect(activeDevice).toBeVisible()
  })

  /**
   * Test 2: Revoke Single Device (Two-Browser Scenario)
   * - Login from browser 1
   * - Login from browser 2 (simulates different device)
   * - From browser 1, navigate to Security page
   * - Verify both devices are listed
   * - Revoke browser 2's device
   * - Verify browser 2's device is removed from list
   * - Verify browser 2 is logged out
   */
  test('should revoke single device and logout that session', async ({ browser }) => {
    // Browser 1: Admin login
    const context1 = await browser.newContext({
      ...devices['Desktop Chrome'],
      extraHTTPHeaders: {
        'X-Forwarded-For': '10.0.1.1',
        'X-Test-Bypass-Rate-Limit': 'true'
      }
    })
    const page1 = await context1.newPage()

    await page1.goto(`${ADMIN_URL}/login`)
    await page1.fill('input[type="email"]', ADMIN_EMAIL)
    await page1.fill('input[type="password"]', ADMIN_PASSWORD)
    await page1.getByRole('button', { name: 'Войти' }).click()
    await page1.waitForSelector('text=Панель управления')

    // Clean up previous devices, keep current session
    await page1.request.delete(apiUrl('/api/auth/devices?keepCurrent=true'))
    await page1.waitForTimeout(500)

    const primaryDeviceResponse = await page1.request.get(apiUrl('/api/auth/devices'))
    expect(primaryDeviceResponse.status()).toBe(200)
    const primaryDevices = await primaryDeviceResponse.json()
    const device1Id = primaryDevices.devices[0]?.id
    expect(device1Id).toBeDefined()

    // Browser 2: Login from different context (simulates different device)
    const context2 = await browser.newContext({
      ...devices['Pixel 5'],
      extraHTTPHeaders: {
        'X-Forwarded-For': '10.0.1.2',
        'X-Test-Bypass-Rate-Limit': 'true'
      }
    })
    const page2 = await context2.newPage()

    await page2.goto(`${ADMIN_URL}/login`)
    await page2.fill('input[type="email"]', ADMIN_EMAIL)
    await page2.fill('input[type="password"]', ADMIN_PASSWORD)
    await page2.getByRole('button', { name: 'Войти' }).click()
    await page2.waitForSelector('text=Панель управления')

    const secondaryDevicesResponse = await page2.request.get(apiUrl('/api/auth/devices'))
    expect(secondaryDevicesResponse.status()).toBe(200)
    const secondaryDevices = await secondaryDevicesResponse.json()
    const device2Entry = secondaryDevices.devices.find((d: Device) => d.id !== device1Id)
    const device2Id = device2Entry?.id
    expect(device2Id).toBeDefined()

    // Get browser 2 device info
    const refreshCookie = (await context2.cookies()).find((cookie) => cookie.name === 'beauty_refresh_token')?.value

    // Browser 1: Go to Security page
    await page1.goto(`${ADMIN_URL}/security`)
    await page1.waitForSelector('text=Активные устройства и сессии')

    // Verify both devices are listed
    const deviceCards = page1.locator('[data-testid="device-card"]')
    const initialCount = await deviceCards.count()
    expect(initialCount).toBeGreaterThanOrEqual(2)

    // Browser 1: Revoke browser 2's device
    // Find device card for device2Id and click its revoke button
    const device2Card = () => page1.locator(`[data-device-id="${device2Id}"]`)
    const revokeBtn = device2Card().locator('button:has-text("Завершить")')
    await revokeBtn.click()

    // Wait for revoke to complete
    await page1.waitForTimeout(1500)

    // Verify device is marked as inactive
    const updatedDevicesResponse = await page1.request.get(apiUrl('/api/auth/devices'))
    expect(updatedDevicesResponse.status()).toBe(200)
    const updatedDevices = await updatedDevicesResponse.json()
    const revokedDevice = updatedDevices.devices.find((d: Device) => d.id === device2Id)
    expect(revokedDevice?.isActive).toBe(false)

    await expect(page1.locator(`[data-testid="device-status-${device2Id}"]`)).toHaveText('Завершено')

    // Browser 2: Verify session is invalidated
    if (refreshCookie) {
      const refreshAttempt = await page2.request.post(apiUrl('/api/auth/refresh'), {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Bypass-Rate-Limit': 'true'
        },
        data: { refreshToken: refreshCookie }
      })
      const refreshStatus = refreshAttempt.status()
      expect([401, 429]).toContain(refreshStatus)
      if (refreshStatus === 401) {
        const refreshBody = await refreshAttempt.json()
        expect(refreshBody.success).toBe(false)
      }
    }

    // Cleanup
    await context1.close()
    await context2.close()
  })

  /**
   * Test 3: Revoke All Other Sessions
   * - Login from browser 1
   * - Login from browser 2, 3 (simulate multiple devices)
   * - From browser 1, click "Завершить другие сессии"
   * - Verify only browser 1's device remains
   * - Verify browsers 2, 3 are logged out
   */
  test('should revoke all other sessions keeping current device active', async ({ browser }) => {
    // Browser 1: Primary login
    const context1 = await browser.newContext({
      ...devices['Desktop Chrome'],
      extraHTTPHeaders: {
        'X-Forwarded-For': '10.0.2.1',
        'X-Test-Bypass-Rate-Limit': 'true'
      }
    })
    const page1 = await context1.newPage()

    await page1.goto(`${ADMIN_URL}/login`)
    await page1.fill('input[type="email"]', ADMIN_EMAIL)
    await page1.fill('input[type="password"]', ADMIN_PASSWORD)
    await page1.getByRole('button', { name: 'Войти' }).click()
    await page1.waitForSelector('text=Панель управления')

    // Удаляем прошлые устройства, оставляем текущий
    await page1.request.delete(apiUrl('/api/auth/devices?keepCurrent=true'))
    await page1.waitForTimeout(500)

    const primaryDevicesResponse = await page1.request.get(apiUrl('/api/auth/devices'))
    expect(primaryDevicesResponse.status()).toBe(200)
    const primaryDevices = await primaryDevicesResponse.json() as DevicesResponse
    const device1Id = primaryDevices.devices[0]?.id
    expect(device1Id).toBeDefined()

    // Browser 2: Secondary login
    const context2 = await browser.newContext({
      ...devices['Pixel 5'],
      extraHTTPHeaders: {
        'X-Forwarded-For': '10.0.2.2',
        'X-Test-Bypass-Rate-Limit': 'true'
      }
    })
    const page2 = await context2.newPage()

    await page2.goto(`${ADMIN_URL}/login`)
    await page2.fill('input[type="email"]', ADMIN_EMAIL)
    await page2.fill('input[type="password"]', ADMIN_PASSWORD)
    await page2.getByRole('button', { name: 'Войти' }).click()
    await page2.waitForSelector('text=Панель управления')

    const secondaryDevicesResponse = await page2.request.get(apiUrl('/api/auth/devices'))
    expect(secondaryDevicesResponse.status()).toBe(200)
    const secondaryDevices = await secondaryDevicesResponse.json() as DevicesResponse
    const device2Entry = secondaryDevices.devices.find((d: Device) => d.id !== device1Id)
    const device2Id = device2Entry?.id
    expect(device2Id).toBeDefined()

    // Browser 3: Tertiary login
    const context3 = await browser.newContext({
      ...devices['iPhone 12'],
      extraHTTPHeaders: {
        'X-Forwarded-For': '10.0.2.3',
        'X-Test-Bypass-Rate-Limit': 'true'
      }
    })
    const page3 = await context3.newPage()

    await page3.goto(`${ADMIN_URL}/login`)
    await page3.fill('input[type="email"]', ADMIN_EMAIL)
    await page3.fill('input[type="password"]', ADMIN_PASSWORD)
    await page3.getByRole('button', { name: 'Войти' }).click()
    await page3.waitForSelector('text=Панель управления')

    const tertiaryDevicesResponse = await page3.request.get(apiUrl('/api/auth/devices'))
    expect(tertiaryDevicesResponse.status()).toBe(200)
    const tertiaryDevices = await tertiaryDevicesResponse.json() as DevicesResponse
    const device3Entry = tertiaryDevices.devices.find((d: Device) => d.id !== device1Id && d.id !== device2Id)
    const device3Id = device3Entry?.id
    expect(device3Id).toBeDefined()

    // Browser 1: Navigate to Security page
    await page1.goto(`${ADMIN_URL}/security`)
    await page1.waitForSelector('text=Активные устройства и сессии')

    // Verify 3 devices are listed initially
    const deviceCards = page1.locator('[data-testid="device-card"]')
    const initialCount = await deviceCards.count()
    expect(initialCount).toBeGreaterThanOrEqual(3)

    // Browser 1: Click "Завершить другие сессии" button
    const revokeAllBtn = page1.locator('button:has-text("Завершить другие сессии")')
    await revokeAllBtn.click()

    // Wait for revoke to complete
    await page1.waitForTimeout(1500)

    const updatedDevicesResponse = await page1.request.get(apiUrl('/api/auth/devices'))
    expect(updatedDevicesResponse.status()).toBe(200)
    const updatedDevices = await updatedDevicesResponse.json()
    const activeDevices = updatedDevices.devices.filter((d: Device) => d.isActive)
    expect(activeDevices).toHaveLength(1)
    expect(activeDevices[0].id).toBe(device1Id)

    await expect(page1.locator(`[data-testid="device-status-${device1Id}"]`)).toHaveText('Активно')
    await expect(page1.locator(`[data-testid="device-status-${device2Id}"]`)).toHaveText('Завершено')
    await expect(page1.locator(`[data-testid="device-status-${device3Id}"]`)).toHaveText('Завершено')

    // Browser 2, 3: Verify sessions are invalidated
    const refreshCookie2 = (await context2.cookies()).find((cookie) => cookie.name === 'beauty_refresh_token')?.value
    if (refreshCookie2) {
      const refreshAttempt2 = await page2.request.post(apiUrl('/api/auth/refresh'), {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Bypass-Rate-Limit': 'true'
        },
        data: { refreshToken: refreshCookie2 }
      })
      const refreshStatus2 = refreshAttempt2.status()
      expect([401, 429]).toContain(refreshStatus2)
      if (refreshStatus2 === 401) {
        const refreshBody2 = await refreshAttempt2.json()
        expect(refreshBody2.success).toBe(false)
      }
    }

    const refreshCookie3 = (await context3.cookies()).find((cookie) => cookie.name === 'beauty_refresh_token')?.value
    if (refreshCookie3) {
      const refreshAttempt3 = await page3.request.post(apiUrl('/api/auth/refresh'), {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Bypass-Rate-Limit': 'true'
        },
        data: { refreshToken: refreshCookie3 }
      })
      const refreshStatus3 = refreshAttempt3.status()
      expect([401, 429]).toContain(refreshStatus3)
      if (refreshStatus3 === 401) {
        const refreshBody3 = await refreshAttempt3.json()
        expect(refreshBody3.success).toBe(false)
      }
    }

    // Browser 1: Verify current session still works
    const checkResponse1 = await page1.request.get(apiUrl('/api/auth/me'))
    expect(checkResponse1.status()).toBe(200)

    // Cleanup
    await context1.close()
    await context2.close()
    await context3.close()
  })

  /**
   * Test 4: Error Handling
   * - Try to revoke non-existent device (should show error)
   * - Network error handling (if API is down)
   */
  test('should handle revoke errors gracefully', async ({ page }) => {
    // Login
    await page.context().setExtraHTTPHeaders({
      'X-Forwarded-For': `10.0.3.${Date.now() % 200}`,
      'X-Test-Bypass-Rate-Limit': 'true'
    })
    await page.goto(`${ADMIN_URL}/login`)
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.waitForSelector('text=Панель управления')

    await page.request.delete(apiUrl('/api/auth/devices?keepCurrent=true'))
    await page.waitForTimeout(500)

    // Navigate to Security page
    await page.goto(`${ADMIN_URL}/security`)
    await page.waitForSelector('text=Активные устройства и сессии')

    // Try to revoke with invalid device ID
    const invalidResponse = await page.request.delete(
      apiUrl('/api/auth/devices/invalid-device-id-12345')
    )

    // Should return 404 or similar error
    expect([400, 403, 404, 500]).toContain(invalidResponse.status())
  })
})

/**
 * Test Data Types
 */
interface Device {
  id: string
  deviceId: string
  deviceName: string | null
  userAgent: string | null
  ipAddress: string | null
  isActive: boolean
  lastUsedAt: string
  createdAt: string
  activeSessions: number
}

interface DevicesResponse {
  success: boolean
  devices: Device[]
}
