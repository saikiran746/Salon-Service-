const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

// Default fallback values if settings are not available
const DEFAULTS = {
  site_name: 'TONI & GUY ESSENSUALS',
  address: 'Plot No. 45, Near Botanical Garden, Kondapur, Hyderabad, 500084',
  phone: '+91 98765 43210',
  email: 'info@essensualskondapur.com',
  gstin: '27AAAAA0000A1Z5',
  bank_name: 'Toni & Guy Partner Bank',
  ifsc_code: 'TGIB0002',
  account_number: '9876543210987',
};

const generateInvoicePDF = async (billData, billId, salonSettings = {}) => {
  const { invoiceNumber, customer, items, subtotal, discount, discountAmount, taxAmount, totalAmount, payment_method, date } = billData;

  // Merge provided settings with defaults
  const s = { ...DEFAULTS, ...salonSettings };

  const outputDir = path.join(process.cwd(), 'uploads', 'invoices');
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${billId}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Styling Colors
    const black = '#1a1a1a';
    const gold = '#C9A84C';
    const lightGray = '#777777';
    const thinBorderColor = '#e2e2e2';

    // 1. TOP BRANDING SECTION (Center-aligned) — uses settings
    const pageWidth = doc.page.width;
    
    doc.fillColor(black).fontSize(14).font('Helvetica-Bold').text(s.site_name, 0, 50, { align: 'center', width: pageWidth });
    doc.fillColor(lightGray).fontSize(9).font('Helvetica').text(s.address, 0, 68, { align: 'center', width: pageWidth });
    doc.text(`Phone: ${s.phone} | Email: ${s.email}`, 0, 81, { align: 'center', width: pageWidth });
    if (s.gstin) {
      doc.text(`GSTIN: ${s.gstin}`, 0, 94, { align: 'center', width: pageWidth });
    }

    // Huge bold INVOICE label
    doc.fillColor(black).fontSize(26).font('Helvetica-Bold').text('INVOICE', 0, 115, { align: 'center', width: pageWidth });

    // Gold decorative horizontal divider line behind/underneath INVOICE label
    doc.moveTo(50, 150).lineTo(doc.page.width - 50, 150).strokeColor(gold).lineWidth(1).stroke();

    // 2. CUSTOMER & METADATA SECTIONS (Side-by-Side)
    const clientY = 170;

    // Left Side: Bill To
    doc.fillColor(black).fontSize(9).font('Helvetica-Bold').text('BILL TO:', 50, clientY);
    doc.fontSize(12).font('Helvetica-Bold').text(customer.name || 'Walk-In Customer', 50, clientY + 15);
    
    doc.fillColor(lightGray).fontSize(9).font('Helvetica');
    if (customer.phone) {
      doc.text(`Phone: +91 ${customer.phone}`, 50, clientY + 32);
    }
    if (customer.email && !customer.email.endsWith('@luxesalon.local') && !customer.email.endsWith('@luxesalon.com')) {
      doc.text(`Email: ${customer.email}`, 50, clientY + 46);
    }

    // Right Side: Invoice Info Metadata
    const metadataX = 350;
    const metadataWidth = doc.page.width - metadataX - 50;

    doc.fillColor(lightGray).fontSize(9).font('Helvetica');
    
    // Align keys to left of right-column, values to right of right-column
    const drawMetaRow = (label, val, offsetVal) => {
      doc.font('Helvetica-Bold').fillColor(lightGray).text(label, metadataX, clientY + offsetVal);
      doc.font('Helvetica').fillColor(black).text(val, metadataX, clientY + offsetVal, { align: 'right', width: metadataWidth });
    };

    drawMetaRow('Invoice #:', invoiceNumber, 0);
    drawMetaRow('Issue Date:', date, 14);
    drawMetaRow('Due Date:', date, 28);

    // 3. TABLE SECTIONS (Clean white table with thin horizontal dividers)
    const tableTop = 260;

    // Header divider line
    doc.moveTo(50, tableTop).lineTo(doc.page.width - 50, tableTop).strokeColor(thinBorderColor).lineWidth(1).stroke();

    // Header Text Columns
    doc.fillColor(black).fontSize(9).font('Helvetica-Bold')
      .text('Service Name', 60, tableTop + 7)
      .text('QTY', 250, tableTop + 7, { width: 40, align: 'center' })
      .text('Price', 300, tableTop + 7, { width: 70, align: 'right' })
      .text('Discount (%)', 380, tableTop + 7, { width: 80, align: 'right' })
      .text('Final Amount', 470, tableTop + 7, { width: 75, align: 'right' });

    // Header bottom line
    doc.moveTo(50, tableTop + 22).lineTo(doc.page.width - 50, tableTop + 22).strokeColor(thinBorderColor).lineWidth(1).stroke();

    // Render items list
    let itemY = tableTop + 30;
    items.forEach((item) => {
      const priceVal = parseFloat(item.unit_price || item.price || 0);
      const qtyVal = parseInt(item.quantity || 1);
      const discountPct = parseFloat(item.discount_percentage || 0);
      const finalAmountVal = parseFloat(item.final_amount !== undefined ? item.final_amount : (priceVal * qtyVal - (priceVal * qtyVal * discountPct / 100)));

      doc.fillColor(black).fontSize(9).font('Helvetica')
        .text(item.description, 60, itemY)
        .text(String(qtyVal), 250, itemY, { width: 40, align: 'center' })
        .text(`₹${priceVal.toFixed(2)}`, 300, itemY, { width: 70, align: 'right' })
        .text(`${discountPct}%`, 380, itemY, { width: 80, align: 'right' })
        .text(`₹${finalAmountVal.toFixed(2)}`, 470, itemY, { width: 75, align: 'right' });

      itemY += 20;
    });

    // Table boundary bottom line
    doc.moveTo(50, itemY + 2).lineTo(doc.page.width - 50, itemY + 2).strokeColor(thinBorderColor).lineWidth(1).stroke();
    itemY += 15;

    // 4. FOOTER DETAILS & BILL TOTALS (Side-by-Side) — uses settings for bank details
    const footerY = itemY + 10;

    // Left Side: Payment Terms & Notes
    doc.fillColor(black).fontSize(9).font('Helvetica-Bold').text('Payment Terms:', 50, footerY);
    
    doc.fillColor(lightGray).font('Helvetica')
      .text(`Payment Mode: ${payment_method.toUpperCase()}`, 50, footerY + 14)
      .text(`Bank: ${s.bank_name}`, 50, footerY + 26)
      .text(`IFS Code: ${s.ifsc_code}`, 50, footerY + 38)
      .text(`Account Number: ${s.account_number}`, 50, footerY + 50);

    doc.fillColor(black).font('Helvetica-Bold').text('Notes:', 50, footerY + 70);
    doc.fillColor(lightGray).font('Helvetica').text(`Thank you for choosing ${s.site_name}. We appreciate your styling relationship!`, 50, footerY + 84, { width: 250 });

    // Right Side: Totals Block
    const totalsX = 350;
    const totalsWidth = doc.page.width - totalsX - 50;

    const drawTotalRow = (label, val, offsetVal, isBold = false) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(isBold ? black : lightGray).text(label, totalsX, footerY + offsetVal);
      doc.text(val, totalsX, footerY + offsetVal, { align: 'right', width: totalsWidth });
    };

    const serviceDiscountTotal = items.reduce((sum, item) => {
      const p = parseFloat(item.unit_price || item.price || 0);
      const q = parseInt(item.quantity || 1);
      const d = parseFloat(item.discount_percentage || 0);
      return sum + (p * q * d / 100);
    }, 0);

    const netAmount = parseFloat(subtotal) - serviceDiscountTotal;
    const totalDiscountAmount = serviceDiscountTotal + parseFloat(discountAmount || 0);

    drawTotalRow('Subtotal:', `₹${parseFloat(subtotal).toFixed(2)}`, 0);
    drawTotalRow('Total Discount:', `-₹${totalDiscountAmount.toFixed(2)}`, 14);
    drawTotalRow('Net Amount:', `₹${(netAmount - parseFloat(discountAmount || 0)).toFixed(2)}`, 28);
    drawTotalRow('Tax (GST):', `₹${parseFloat(taxAmount).toFixed(2)}`, 42);
    
    // Settle divider above Total Due
    doc.moveTo(totalsX, footerY + 56).lineTo(doc.page.width - 50, footerY + 56).strokeColor(thinBorderColor).lineWidth(1).stroke();

    // Bold Total Due row
    doc.fillColor(black).fontSize(11).font('Helvetica-Bold');
    doc.text('Total Due:', totalsX, footerY + 63);
    doc.text(`₹${parseFloat(totalAmount).toFixed(2)}`, totalsX, footerY + 63, { align: 'right', width: totalsWidth });

    // Bottom double line under Total Due (as per standard clean POS designs)
    doc.moveTo(totalsX, footerY + 80).lineTo(doc.page.width - 50, footerY + 80).strokeColor(gold).lineWidth(1.5).stroke();

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
};

module.exports = { generateInvoicePDF };
