import express, { type Router } from 'express'
import { prisma } from '@beauty-platform/database'
import { generateDeviceContext } from '../utils/device'
import { getAuthContext } from '../utils/get-auth-context'

const router: Router = express.Router()

router.get('/devices', async (req, res) => {
  try {
    const auth = getAuthContext(req)
    if (!auth.userId) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required'
      })
      return
    }

    const currentContext = generateDeviceContext(req)

    const devices = await prisma.device.findMany({
      where: { userId: auth.userId },
      orderBy: { lastUsedAt: 'desc' },
      include: {
        refreshTokens: {
          where: {
            isUsed: false,
            expiresAt: { gt: new Date() }
          },
          select: {
            id: true,
            expiresAt: true
          }
        }
      }
    })

    const payload = devices.map(device => ({
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
      isActive: device.isActive,
      lastUsedAt: device.lastUsedAt,
      createdAt: device.createdAt,
      activeSessions: device.refreshTokens.length,
      isCurrent: device.deviceId === currentContext.deviceId
    }))

    res.json({
      success: true,
      devices: payload
    })
  } catch (error) {
    console.error('Device list error:', error)
    res.status(500).json({
      success: false,
      error: 'DEVICE_LIST_FAILED',
      message: 'Failed to load devices'
    })
  }
})

router.delete('/devices/:deviceId', async (req, res) => {
  try {
    const auth = getAuthContext(req)
    if (!auth.userId) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required'
      })
      return
    }

    const { deviceId } = req.params

    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId: auth.userId
      }
    })

    if (!device) {
      res.status(404).json({
        success: false,
        error: 'DEVICE_NOT_FOUND',
        message: 'Device not found'
      })
      return
    }

    const now = new Date()

    await prisma.refreshToken.updateMany({
      where: {
        deviceId: device.id,
        isUsed: false
      },
      data: {
        isUsed: true,
        usedAt: now
      }
    })

    await prisma.device.update({
      where: { id: device.id },
      data: {
        isActive: false,
        lastUsedAt: now
      }
    })

    res.json({
      success: true,
      revokedDeviceId: device.id
    })
  } catch (error) {
    console.error('Device revoke error:', error)
    res.status(500).json({
      success: false,
      error: 'DEVICE_REVOKE_FAILED',
      message: 'Failed to revoke device'
    })
  }
})

router.delete('/devices', async (req, res) => {
  try {
    const auth = getAuthContext(req)
    if (!auth.userId) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required'
      })
      return
    }

    const keepCurrent = req.query.keepCurrent === 'true'
    let excludeDeviceId: string | undefined

    if (keepCurrent) {
      const currentFingerprint = generateDeviceContext(req).deviceId
      const currentDevice = await prisma.device.findFirst({
        where: {
          userId: auth.userId,
          deviceId: currentFingerprint
        }
      })
      excludeDeviceId = currentDevice?.id
    }

    const now = new Date()

    const refreshFilter: Record<string, any> = {
      userId: auth.userId,
      isUsed: false
    }

    if (excludeDeviceId) {
      refreshFilter.deviceId = { not: excludeDeviceId }
    }

    const deviceFilter: Record<string, any> = {
      userId: auth.userId
    }

    if (excludeDeviceId) {
      deviceFilter.id = { not: excludeDeviceId }
    }

    const revokedTokens = await prisma.refreshToken.updateMany({
      where: refreshFilter,
      data: {
        isUsed: true,
        usedAt: now
      }
    })

    const deactivatedDevices = await prisma.device.updateMany({
      where: deviceFilter,
      data: {
        isActive: false,
        lastUsedAt: now
      }
    })

    res.json({
      success: true,
      revokedSessions: revokedTokens.count,
      deactivatedDevices: deactivatedDevices.count,
      keptCurrentDevice: Boolean(excludeDeviceId)
    })
  } catch (error) {
    console.error('Device revoke-all error:', error)
    res.status(500).json({
      success: false,
      error: 'DEVICE_REVOKE_ALL_FAILED',
      message: 'Failed to revoke devices'
    })
  }
})

export default router
