import express, { type NextFunction, type Request, type Response, type Router } from 'express'

import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()

const wrapTenantRoute = (
  handler: (req: TenantRequest, res: Response) => Promise<void>
) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

// GET /api/appointments - Получить записи
router.get(
  '/',
  wrapTenantRoute(async (_req, res) => {
    try {
      // ВРЕМЕННО: возвращаем пустой массив пока не создадим appointments
      const appointments: any[] = []

      res.json({
        success: true,
        data: appointments
      })
    } catch (error) {
      console.error('Error fetching appointments:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch appointments'
      })
    }
  })
)

interface DemoAppointmentInput {
  staffId?: string
  date?: string
  time?: string
  clientName?: string
  serviceName?: string
}

// POST /api/appointments - Создать тестовую запись
router.post(
  '/demo',
  wrapTenantRoute(async (req, res) => {
    try {
      const { staffId, date, time, clientName, serviceName } = (req.body ?? {}) as DemoAppointmentInput

      const demoAppointment = {
        id: `demo-${Date.now()}`,
        appointmentNumber: `APP${Date.now()}`,
        date: date || new Date().toISOString().split('T')[0],
        time: time || '10:00',
        clientName: clientName || 'Тестовый клиент',
        serviceName: serviceName || 'Стрижка',
        staffId: staffId ?? null,
        status: 'PENDING',
        notes: 'Тестовая запись',
        createdAt: new Date().toISOString()
      }

      res.status(201).json({
        success: true,
        data: demoAppointment,
        message: 'Demo appointment created'
      })
    } catch (error) {
      console.error('Error creating demo appointment:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create demo appointment'
      })
    }
  })
)

export default router;
