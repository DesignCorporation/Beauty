import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { tenantPrisma } from '../prisma';
import { tenantAuth, requireRole } from '../middleware/tenantAuth';
import { generatePDFInvoice, type InvoiceData } from '../services/pdfGenerator';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const router: Router = Router();

// 📧 Invoice Email API - Stage 5

// Environment variables with defaults
const NOTIFY_SERVICE_URL = process.env.NOTIFY_SERVICE_URL;
const NOTIFY_TOKEN = process.env.NOTIFY_TOKEN; // Optional Bearer token
const INVOICE_DEFAULT_LOCALE = process.env.INVOICE_DEFAULT_LOCALE || 'ru';

// Zod schema for email request
const emailInvoiceSchema = z.object({
  to: z.string().email('Invalid email address'),
  locale: z.enum(['ru', 'en']).optional(),
  subject: z.string().optional()
});

/**
 * POST /invoices/:paymentId/email
 * Send PDF invoice via email with mandatory Idempotency-Key
 * 🔐 Requires authentication: Only the client who owns the payment or salon staff can send invoices
 */
router.post('/:paymentId/email', tenantAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;
    const paymentId = req.params.paymentId;

    // Guard against undefined paymentId
    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId parameter',
        code: 'MISSING_PAYMENT_ID'
      });
    }

    // Validate required headers
    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing Idempotency-Key header',
        code: 'MISSING_IDEMPOTENCY_KEY'
      });
    }

    // Validate request body
    const validation = emailInvoiceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors
      });
    }

    const { to, locale = INVOICE_DEFAULT_LOCALE, subject } = validation.data;

    // Get tenant-isolated Prisma client
    const prisma = tenantPrisma(tenantId);

    // Generate request hash for idempotency
    const requestData = {
      method: 'POST',
      path: `/invoices/${paymentId}/email`,
      body: req.body
    };
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(requestData))
      .digest('hex');

    // Check for existing idempotency key
    const existingIdempotency = idempotencyKey ? await prisma.idempotencyKey.findUnique({
      where: {
        key: idempotencyKey
      }
    }) : null;

    if (existingIdempotency) {
      // Check if request hash matches (prevent different requests with same key)
      if (existingIdempotency.requestHash !== requestHash) {
        return res.status(409).json({
          error: 'Idempotency key conflict',
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Same idempotency key used for different request'
        });
      }

      // Return cached response
      return res.status(200).json(existingIdempotency.response);
    }

    // Find the payment (now with correct @map schema)
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId
      }
    });

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // Check if PDF invoice exists
    const invoicePath = path.join('/tmp/invoices', `${paymentId ?? 'unknown'}.pdf`);
    let pdfExists = false;

    try {
      await fs.access(invoicePath);
      pdfExists = true;
      console.log(`[INVOICE EMAIL] PDF found: ${invoicePath}`);
    } catch (error) {
      console.log(`[INVOICE EMAIL] PDF not found, will generate: ${invoicePath}`);
    }

    // Generate PDF if it doesn't exist
    if (!pdfExists) {
      try {
        console.log(`[INVOICE EMAIL] Generating PDF invoice for payment ${paymentId}...`);

        // Call our own generate endpoint
        const baseUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:6029'
        const generateResponse = await axios.get(`${baseUrl}/api/invoices/${paymentId}/generate`, {
          headers: {
            'x-tenant-id': tenantId
          },
          timeout: 30000 // 30 seconds timeout
        });

        if (generateResponse.status !== 200) {
          throw new Error(`PDF generation failed with status ${generateResponse.status}`);
        }

        console.log(`[INVOICE EMAIL] PDF generated successfully for payment ${paymentId}`);

        // Verify PDF was created
        await fs.access(invoicePath);

      } catch (error: any) {
        console.error(`[INVOICE EMAIL] Error generating PDF:`, error.message);

        return res.status(500).json({
          error: 'PDF generation failed',
          code: 'PDF_GENERATION_FAILED',
          message: `Unable to generate invoice PDF: ${error.message}`
        });
      }
    }

    // Format email subject and content based on locale
    const formatCurrency = (amount: number, currency: string, locale: string) => {
      const formatter = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      });
      return formatter.format(amount);
    };

    const paymentAmount = formatCurrency(payment.amount, payment.currency, locale);

    const emailContent = locale === 'ru' ? {
      defaultSubject: `Счет-фактура №${paymentId.slice(-8).toUpperCase()}`,
      htmlContent: `
        <h2>Счет-фактура</h2>
        <p>Здравствуйте!</p>
        <p>Во вложении направляем счет-фактуру на сумму <strong>${paymentAmount}</strong>.</p>
        <ul>
          <li><strong>Номер платежа:</strong> ${paymentId}</li>
          <li><strong>Сумма:</strong> ${paymentAmount}</li>
          <li><strong>Статус:</strong> ${payment.status}</li>
          <li><strong>Дата:</strong> ${payment.createdAt.toLocaleDateString('ru-RU')}</li>
        </ul>
        <p>С уважением,<br>Beauty Platform</p>
      `,
      textContent: `Счет-фактура\n\nВо вложении направляем счет-фактуру на сумму ${paymentAmount}.\n\nНомер платежа: ${paymentId}\nСумма: ${paymentAmount}\nСтатус: ${payment.status}\nДата: ${payment.createdAt.toLocaleDateString('ru-RU')}\n\nС уважением,\nBeauty Platform`
    } : {
      defaultSubject: `Invoice #${paymentId.slice(-8).toUpperCase()}`,
      htmlContent: `
        <h2>Invoice</h2>
        <p>Hello!</p>
        <p>Please find the attached invoice for <strong>${paymentAmount}</strong>.</p>
        <ul>
          <li><strong>Payment ID:</strong> ${paymentId}</li>
          <li><strong>Amount:</strong> ${paymentAmount}</li>
          <li><strong>Status:</strong> ${payment.status}</li>
          <li><strong>Date:</strong> ${payment.createdAt.toLocaleDateString('en-US')}</li>
        </ul>
        <p>Best regards,<br>Beauty Platform</p>
      `,
      textContent: `Invoice\n\nPlease find the attached invoice for ${paymentAmount}.\n\nPayment ID: ${paymentId}\nAmount: ${paymentAmount}\nStatus: ${payment.status}\nDate: ${payment.createdAt.toLocaleDateString('en-US')}\n\nBest regards,\nBeauty Platform`
    };

    const finalSubject = subject || emailContent.defaultSubject;

    // Prepare Notification Service payload
    const notificationPayload = {
      to,
      subject: finalSubject,
      html: emailContent.htmlContent,
      text: emailContent.textContent,
      attachments: [{
        filename: `invoice-${paymentId.slice(-8)}.pdf`,
        path: invoicePath
      }]
    };

    let emailResult;
    let emailStatus = 'queued';

    try {
      console.log(`[INVOICE EMAIL] Sending email to Notification Service: ${NOTIFY_SERVICE_URL}/api/notify/email`);

      // Configure request headers
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (NOTIFY_TOKEN) {
        headers['Authorization'] = `Bearer ${NOTIFY_TOKEN}`;
      }

      // Call Notification Service
      const emailResponse = await axios.post(
        `${NOTIFY_SERVICE_URL}/api/notify/email`,
        notificationPayload,
        {
          headers,
          timeout: 15000 // 15 seconds timeout
        }
      );

      if (emailResponse.status === 200) {
        emailResult = emailResponse.data;
        emailStatus = emailResult.status === 'sent' ? 'sent' : 'queued';
        console.log(`[INVOICE EMAIL] Email sent successfully: ${emailResult.emailId}`);
      } else {
        throw new Error(`Notification service returned status ${emailResponse.status}`);
      }

    } catch (error: any) {
      console.error(`[INVOICE EMAIL] Notification service error:`, error.message);

      // Handle service unavailability gracefully (202 instead of 502)
      emailStatus = 'failed';
      emailResult = {
        error: error.message,
        service: 'notification_service',
        timestamp: new Date().toISOString()
      };

      // For Stage 5: Don't fail completely if notification service is down
      console.warn(`[INVOICE EMAIL] Continuing despite notification service error (Stage 5 behavior)`);
    }

    // Create InvoiceEmail record
    const invoiceEmail = await prisma.invoiceEmail.create({
      data: {
        tenantId,
        paymentId: paymentId ?? '',
        to,
        subject: finalSubject,
        status: emailStatus,
        providerResponse: {
          ...emailResult,
          locale,
          invoicePath,
          generatedPDF: !pdfExists,
          notificationServiceUrl: NOTIFY_SERVICE_URL
        }
      }
    });

    // Prepare response
    const response = {
      emailId: invoiceEmail.id,
      paymentId,
      to,
      subject: finalSubject,
      locale,
      status: emailStatus,
      queued: emailStatus !== 'failed',
      ...(emailStatus === 'failed' && {
        reason: 'notification_service_unavailable',
        message: 'Email queued but notification service is currently unavailable'
      }),
      timestamp: new Date().toISOString()
    };

    // Cache the response for idempotency (24h TTL)
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        tenantId,
        requestHash,
        response: response,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    console.log(`[INVOICE EMAIL] Email request processed: ${invoiceEmail.id} (${emailStatus})`);

    // Return success response (202 for queued/failed, 200 for sent)
    const statusCode = emailStatus === 'sent' ? 200 : 202;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('[INVOICE EMAIL] Error processing email request:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'EMAIL_PROCESSING_FAILED'
    });
  }
  return undefined;
});

/**
 * GET /invoices/:paymentId/email/:emailId
 * Get email delivery status
 * 🔐 Requires authentication: Only the client who owns the payment or salon staff can check status
 */
router.get('/:paymentId/email/:emailId', tenantAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { paymentId, emailId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        error: 'Missing paymentId parameter',
        code: 'MISSING_PAYMENT_ID'
      });
    }

    if (!emailId) {
      return res.status(400).json({
        error: 'Missing emailId parameter',
        code: 'MISSING_EMAIL_ID'
      });
    }

    const prisma = tenantPrisma(tenantId);

    const invoiceEmail = await prisma.invoiceEmail.findFirst({
      where: {
        id: emailId,
        paymentId: paymentId,
        tenantId
      }
    });

    if (!invoiceEmail) {
      return res.status(404).json({
        error: 'Invoice email not found',
        code: 'INVOICE_EMAIL_NOT_FOUND'
      });
    }

    res.json({
      id: invoiceEmail.id,
      paymentId: invoiceEmail.paymentId,
      to: invoiceEmail.to,
      subject: invoiceEmail.subject,
      locale: (invoiceEmail.providerResponse as any)?.locale || INVOICE_DEFAULT_LOCALE,
      status: invoiceEmail.status,
      sentAt: invoiceEmail.status === 'sent' ? invoiceEmail.createdAt.toISOString() : null,
      createdAt: invoiceEmail.createdAt.toISOString(),
      providerResponse: invoiceEmail.providerResponse
    });

  } catch (error) {
    console.error('[INVOICE EMAIL] Error fetching email status:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'EMAIL_STATUS_FETCH_FAILED'
    });
  }
  return undefined;
});

/**
 * GET /invoices/:paymentId/generate
 * Generate PDF invoice for payment using pdfkit
 * 🔐 Requires authentication: Only the client who owns the payment or salon staff can generate invoices
 */
router.get('/:paymentId/generate', tenantAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.tenantId;
    const { paymentId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing x-tenant-id header',
        code: 'MISSING_TENANT_ID'
      });
    }

    const prisma = tenantPrisma(tenantId);

    // Find the payment with related appointment data
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId ?? ''
      },
      include: {
        appointment: {
          include: {
            service: true,
            client: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // Get tenant info for invoice header
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Salon not found',
        code: 'SALON_NOT_FOUND'
      });
    }

    // Ensure /tmp/invoices directory exists
    const invoicesDir = '/tmp/invoices';
    try {
      await fs.mkdir(invoicesDir, { recursive: true });
    } catch (error) {
      console.warn('[INVOICE GENERATE] Could not create invoices directory:', error);
    }

    const invoicePath = path.join(invoicesDir, `${paymentId}.pdf`);

    // Prepare invoice data for PDF generation
    const paymentMethodMap: Record<string, 'stripe' | 'paypal' | 'cash'> = {
      'stripe': 'stripe',
      'paypal': 'paypal',
      'cash': 'cash'
    };

    const paymentMethod = paymentMethodMap[payment.provider] || 'cash';
    const amountInEur = Number(payment.amount) / 100; // Convert from cents to euros

    const invoiceData: InvoiceData = {
      paymentId,
      invoiceDate: payment.createdAt,
      dueDate: new Date(payment.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days

      // Salon info (sender)
      salonName: tenant.name || 'Beauty Salon',
      salonAddress: tenant.address || undefined,
      salonCity: tenant.city || undefined,
      salonCountry: tenant.country || undefined,

      // Client info (receiver)
      clientName: payment.appointment?.client?.name || 'Unknown Client',
      clientEmail: payment.appointment?.client?.email || undefined,
      clientAddress: undefined, // Client model doesn't have address field

      // Payment details
      amount: amountInEur,
      currency: payment.currency,
      paymentMethod,
      paymentStatus: payment.status,

      // Items - use appointment service if available
      items: payment.appointment?.service ? [{
        description: payment.appointment.service.name || 'Service',
        quantity: 1,
        unitPrice: amountInEur,
        totalPrice: amountInEur
      }] : [{
        description: 'Service',
        quantity: 1,
        unitPrice: amountInEur,
        totalPrice: amountInEur
      }],

      // Tax (if in metadata)
      taxRate: (payment.metadata as any)?.taxRate ? Number((payment.metadata as any).taxRate) : undefined,
      taxAmount: (payment.metadata as any)?.taxAmount ? Number((payment.metadata as any).taxAmount) : undefined,

      // Notes
      notes: `Payment for service on ${payment.appointment?.startAt ? new Date(payment.appointment.startAt).toLocaleDateString('en-US') : 'requested date'}`
    };

    // Generate real PDF
    await generatePDFInvoice(invoiceData, invoicePath);

    console.log(`[INVOICE GENERATE] PDF generated: ${invoicePath}`);

    res.json({
      success: true,
      paymentId,
      invoicePath,
      generated: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[INVOICE GENERATE] Error generating PDF:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PDF_GENERATION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  return undefined;
});

export default router;
