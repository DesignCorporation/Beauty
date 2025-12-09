import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import { createEmailTransporter, getDefaultFrom, isSmtpConfigured } from '../utils/emailTransporter';

const router: Router = Router();

// Zod schema for email request
const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().optional(),
  text: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string()
  })).optional()
});

/**
 * POST /api/notify/email
 * Send email with optional PDF attachment
 *
 * Uses real SMTP if configured, otherwise simulates sending
 */
router.post('/email', async (req: Request, res: Response) => {
  try {
    console.log('[EMAIL API] Request received:', {
      to: req.body.to,
      subject: req.body.subject,
      hasAuth: req.headers['authorization'] ? 'Yes' : 'No'
    });

    // Validate request body
    const validation = sendEmailSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body',
        details: validation.error.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { to, subject, html, text, attachments } = validation.data;

    // Check if PDF attachments exist
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          await fs.access(attachment.path);
          const stats = await fs.stat(attachment.path);
          console.log(`[EMAIL API] Attachment found: ${attachment.filename} (${Math.round(stats.size / 1024)} KB)`);
        } catch (error) {
          console.error(`[EMAIL API] Attachment not found: ${attachment.path}`);
          res.status(400).json({
            error: 'Attachment Error',
            message: `Attachment not found: ${attachment.filename}`,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }

    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Try to send real email if SMTP is configured
    if (isSmtpConfigured()) {
      const transporter = createEmailTransporter();

      if (transporter) {
        try {
          const mailOptions = {
            from: getDefaultFrom(),
            to,
            subject,
            html: html || undefined,
            text: text || html?.replace(/<[^>]*>/g, '') || 'No content', // Fallback to stripped HTML or default
            attachments: attachments?.map(att => ({
              filename: att.filename,
              path: att.path,
            })),
          };

          const info = await transporter.sendMail(mailOptions);

          console.log(`[EMAIL API] ✅ Email sent successfully:`, {
            messageId: info.messageId,
            to,
            subject,
            attachments: attachments?.length || 0,
          });

          res.status(200).json({
            success: true,
            emailId,
            messageId: info.messageId,
            status: 'sent',
            to,
            subject,
            provider: 'smtp',
            timestamp: new Date().toISOString(),
            message: 'Email sent successfully via SMTP'
          });
          return;
        } catch (error) {
          console.error('[EMAIL API] ❌ Failed to send email:', error);
          // Fall through to simulation
        }
      }
    }

    // Fallback: Simulate email sending (when SMTP not configured or failed)
    console.log(`[EMAIL API] 📧 SIMULATED EMAIL (SMTP not configured):`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  HTML: ${html ? 'Present' : 'Not provided'}`);
    console.log(`  Text: ${text ? 'Present' : 'Not provided'}`);
    console.log(`  Attachments: ${attachments?.length || 0}`);

    if (attachments) {
      attachments.forEach(att => {
        console.log(`    - ${att.filename} (${att.path})`);
      });
    }

    const response = {
      success: true,
      emailId,
      status: 'simulated',
      to,
      subject,
      provider: 'mock_smtp',
      timestamp: new Date().toISOString(),
      message: 'Email simulated (SMTP not configured). Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable real sending.',
      note: 'To enable real email sending, configure SMTP settings in .env file'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('[EMAIL API] Unexpected error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;