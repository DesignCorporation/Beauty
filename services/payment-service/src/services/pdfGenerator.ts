/**
 * PDF Invoice Generator Service
 * Generates real PDF invoices using pdfkit
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface InvoiceData {
  paymentId: string;
  invoiceDate: Date;
  dueDate?: Date;

  // Salon/Sender info
  salonName: string;
  salonAddress?: string;
  salonCity?: string;
  salonCountry?: string;

  // Client/Receiver info
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;

  // Payment details
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'paypal' | 'cash';
  paymentStatus: string;

  // Items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  // Tax info (optional)
  taxRate?: number;
  taxAmount?: number;

  // Notes
  notes?: string;
}

/**
 * Generate a real PDF invoice
 */
export async function generatePDFInvoice(data: InvoiceData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // ===== HEADER =====
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Invoice #${data.paymentId.slice(-8).toUpperCase()}`, { align: 'center' });
      doc.moveDown(1);

      // ===== SENDER INFO (LEFT) =====
      doc.fontSize(11).font('Helvetica-Bold').text('FROM:');
      doc.fontSize(10).font('Helvetica');
      doc.text(data.salonName);
      if (data.salonAddress) doc.text(data.salonAddress);
      if (data.salonCity) doc.text(data.salonCity);
      if (data.salonCountry) doc.text(data.salonCountry);

      // ===== RECEIVER INFO (RIGHT) =====
      const receiverX = 350;
      doc.fontSize(11).font('Helvetica-Bold').text('BILL TO:', receiverX, doc.y - 60);
      doc.fontSize(10).font('Helvetica');
      doc.text(data.clientName, receiverX);
      if (data.clientEmail) doc.text(data.clientEmail, receiverX);
      if (data.clientAddress) doc.text(data.clientAddress, receiverX);

      doc.moveDown(1.5);

      // ===== DATES =====
      const dateX = 350;
      const invoiceDate = data.invoiceDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      doc.fontSize(10).text(`Invoice Date: ${invoiceDate}`, dateX, doc.y);

      if (data.dueDate) {
        const dueDate = data.dueDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        doc.text(`Due Date: ${dueDate}`, dateX);
      }

      doc.moveDown(1);

      // ===== ITEMS TABLE =====
      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 350;
      const col3X = 420;
      const col4X = 500;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', col1X, tableTop);
      doc.text('Qty', col2X, tableTop);
      doc.text('Unit Price', col3X, tableTop);
      doc.text('Total', col4X, tableTop);

      // Horizontal line
      doc.moveTo(col1X, tableTop + 20).lineTo(550, tableTop + 20).stroke();

      let y = tableTop + 30;
      doc.fontSize(9).font('Helvetica');

      // Items
      data.items.forEach((item) => {
        doc.text(item.description, col1X, y);
        doc.text(item.quantity.toString(), col2X, y);
        doc.text(`${data.currency} ${item.unitPrice.toFixed(2)}`, col3X, y);
        doc.text(`${data.currency} ${item.totalPrice.toFixed(2)}`, col4X, y);
        y += 25;
      });

      // Horizontal line before totals
      doc.moveTo(col1X, y).lineTo(550, y).stroke();
      y += 10;

      // ===== TOTALS (RIGHT SIDE) =====
      const subtotal = data.amount / (1 + (data.taxRate || 0) / 100);
      const tax = data.amount - subtotal;

      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', col3X, y);
      doc.text(`${data.currency} ${subtotal.toFixed(2)}`, col4X, y, { align: 'right' });

      if (data.taxRate && data.taxRate > 0) {
        y += 20;
        doc.text(`Tax (${data.taxRate}%):`, col3X, y);
        doc.text(`${data.currency} ${tax.toFixed(2)}`, col4X, y, { align: 'right' });
      }

      y += 20;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL:', col3X, y);
      doc.text(`${data.currency} ${data.amount.toFixed(2)}`, col4X, y, { align: 'right' });

      // Horizontal line after totals
      y += 10;
      doc.moveTo(col1X, y).lineTo(550, y).stroke();

      // ===== PAYMENT STATUS & METHOD =====
      y += 20;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Payment Method: ${data.paymentMethod.toUpperCase()}`);
      doc.text(`Payment Status: ${data.paymentStatus}`);

      // ===== FOOTER / NOTES =====
      y = doc.page.height - 100;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      if (data.notes) {
        doc.fontSize(9).text('Notes:', 50, y);
        doc.fontSize(8).text(data.notes, 50, y + 15);
      }

      // Company footer
      y = doc.page.height - 50;
      doc.fontSize(8).font('Helvetica').text(
        'Thank you for your business! This invoice was generated automatically by Beauty Platform.',
        50,
        y,
        { align: 'center', width: 500 }
      );

      // End document
      doc.end();

      // Handle stream events
      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}
