import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { FARM, niceDate } from './farm';
import { Bill } from './models';

const GOLD: [number, number, number] = [201, 162, 39];
const GOLD_BRIGHT: [number, number, number] = [228, 199, 102];
const GOLD_DEEP: [number, number, number] = [143, 117, 25];
const DARK: [number, number, number] = [15, 13, 8];
const INK: [number, number, number] = [33, 30, 23];
const MUTED: [number, number, number] = [120, 113, 96];
const IVORY: [number, number, number] = [238, 231, 210];
const CREAM: [number, number, number] = [247, 241, 226];
const CREAM_ROW: [number, number, number] = [251, 247, 238];
const RED_ON_DARK: [number, number, number] = [242, 130, 112];
const GREEN_ON_DARK: [number, number, number] = [154, 206, 132];

/** The ₹ glyph is not available in standard PDF fonts, so "Rs." is used. */
function money(value: number): string {
  return 'Rs. ' + (Math.round(value * 100) / 100).toLocaleString('en-IN');
}

let logoCache: string | null = null;

/**
 * Loads the brand logo as a dataURL for the PDF header.
 * `logoPrint` is deliberately the JPEG master, not the transparent web mark:
 * `addImage` below is called with the 'JPEG' format and jsPDF's PNG path does
 * not handle the alpha channel reliably.
 */
async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch(FARM.logoPrint);
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoCache;
  } catch {
    return null;
  }
}

let signatureCache: string | null = null;

/** Founder's scanned signature (transparent PNG) for the authorised-signatory block. */
async function loadSignature(): Promise<string | null> {
  if (signatureCache) return signatureCache;
  try {
    const res = await fetch('assets/brand/signature.png');
    const blob = await res.blob();
    signatureCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return signatureCache;
  } catch {
    return null;
  }
}

/**
 * Premium ledger-style bill PDF — black & gold header with the real farm logo,
 * BILL TO card, striped tables, outstanding highlight, signature & footer.
 * The same PDF is generated from both the customer dashboard and the admin customer page.
 */
export async function downloadBillPdf(bill: Bill) {
  const logo = await loadLogo();
  const signature = await loadSignature();

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ============ header band ============
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.rect(0, 0, W, 116, 'F');
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(2.5);
  doc.line(0, 116, W, 116);

  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', 40, 20, 76, 76);
    } catch {
      /* logo skip — text header still fine */
    }
  }
  const tx = logo ? 130 : 40;

  doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.text(FARM.name.toUpperCase() + '\u2122', tx, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(IVORY[0], IVORY[1], IVORY[2]);
  doc.text(FARM.tagline2, tx, 62);

  doc.setFontSize(7.6);
  doc.setTextColor(196, 188, 164);
  doc.text(doc.splitTextToSize(FARM.address, 280), tx, 76);

  const billNo = 'ADF-' + bill.to.replace(/-/g, '') + '-' + String(bill.phone || '').slice(-4);
  doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('BILL / STATEMENT', W - 40, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(IVORY[0], IVORY[1], IVORY[2]);
  doc.text('Bill No: ' + billNo, W - 40, 60, { align: 'right' });
  doc.text('Date: ' + new Date().toLocaleDateString('en-IN'), W - 40, 73, { align: 'right' });
  doc.text('Ph: ' + FARM.phone + '  ·  ' + FARM.email, W - 40, 86, { align: 'right' });

  // ============ BILL TO + PERIOD cards ============
  const cardY = 134;
  doc.setFillColor(CREAM[0], CREAM[1], CREAM[2]);
  doc.roundedRect(40, cardY, 302, 84, 8, 8, 'F');
  doc.setTextColor(GOLD_DEEP[0], GOLD_DEEP[1], GOLD_DEEP[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('B I L L   T O', 54, cardY + 18);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(12.5);
  doc.text(bill.customerName || 'Customer', 54, cardY + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('Phone: ' + bill.phone, 54, cardY + 51);
  if (bill.address) {
    doc.text(doc.splitTextToSize(bill.address, 272).slice(0, 2), 54, cardY + 64);
  }

  doc.setFillColor(CREAM[0], CREAM[1], CREAM[2]);
  doc.roundedRect(356, cardY, W - 40 - 356, 84, 8, 8, 'F');
  doc.setTextColor(GOLD_DEEP[0], GOLD_DEEP[1], GOLD_DEEP[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('B I L L   P E R I O D', 370, cardY + 18);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(10.5);
  doc.text(niceDate(bill.from) + '  to  ' + niceDate(bill.to), 370, cardY + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('Purchase entries: ' + bill.entries.length, 370, cardY + 53);
  doc.text('Payments: ' + bill.payments.length, 370, cardY + 66);

  // ============ purchases table ============
  doc.setTextColor(GOLD_DEEP[0], GOLD_DEEP[1], GOLD_DEEP[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PURCHASES', 40, 244);

  autoTable(doc, {
    startY: 252,
    head: [['#', 'Date', 'Product', 'Qty', 'Rate', 'Amount']],
    body: bill.entries.map((e, i) => [
      String(i + 1),
      niceDate(e.entryDate),
      (e.productName || '') + (e.paid ? '  [PAID]' : '') + (e.note ? '  (' + e.note + ')' : ''),
      (Math.round(e.quantity * 100) / 100) + ' ' + (e.unit || ''),
      money(e.rate),
      money(e.total)
    ]),
    foot: [[{ content: 'Total purchases (this period)', colSpan: 5, styles: { halign: 'right' } }, money(bill.periodTotal)]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: [229, 221, 199], lineWidth: 0.4, cellPadding: 6 },
    headStyles: { fillColor: DARK, textColor: GOLD_BRIGHT, fontStyle: 'bold', fontSize: 8.4 },
    alternateRowStyles: { fillColor: CREAM_ROW },
    footStyles: { fillColor: [26, 22, 13], textColor: GOLD_BRIGHT, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    },
    margin: { left: 40, right: 40 }
  });

  let fy = (doc as any).lastAutoTable.finalY + 22;

  // ============ payments table ============
  if (bill.payments.length > 0) {
    doc.setTextColor(GOLD_DEEP[0], GOLD_DEEP[1], GOLD_DEEP[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAYMENTS RECEIVED', 40, fy);

    autoTable(doc, {
      startY: fy + 8,
      head: [['#', 'Date', 'Mode', 'Note', 'Amount']],
      body: bill.payments.map((p, i) => [
        String(i + 1),
        niceDate(p.paymentDate),
        p.mode || '',
        p.note || '-',
        money(p.amount)
      ]),
      foot: [[{ content: 'Total paid (this period)', colSpan: 4, styles: { halign: 'right' } }, money(bill.periodPaid)]],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: [229, 221, 199], lineWidth: 0.4, cellPadding: 6 },
      headStyles: { fillColor: DARK, textColor: GOLD_BRIGHT, fontStyle: 'bold', fontSize: 8.4 },
      alternateRowStyles: { fillColor: CREAM_ROW },
      footStyles: { fillColor: [26, 22, 13], textColor: GOLD_BRIGHT, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 24, halign: 'center' }, 4: { halign: 'right' } },
      margin: { left: 40, right: 40 }
    });
    fy = (doc as any).lastAutoTable.finalY + 22;
  }

  // ============ totals + outstanding + signature ============
  if (fy > H - 210) {
    doc.addPage();
    fy = 64;
  }

  const bx = W - 40 - 240;
  const bw = 240;
  const row = (label: string, value: string, offset: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(label, bx, fy + offset);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(value, bx + bw, fy + offset, { align: 'right' });
  };

  row('Period purchases', money(bill.periodTotal), 0);
  row('Period payments', money(bill.periodPaid), 16);
  row('Total purchases (all time)', money(bill.lifetimePurchases), 32);
  row('Total paid (all time)', money(bill.lifetimePaid), 48);

  // outstanding pill
  const pillY = fy + 62;
  doc.setFillColor(DARK[0], DARK[1], DARK[2]);
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(1.2);
  doc.roundedRect(bx, pillY, bw, 44, 9, 9, 'FD');
  doc.setTextColor(GOLD_BRIGHT[0], GOLD_BRIGHT[1], GOLD_BRIGHT[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OUTSTANDING (TOTAL DUE)', bx + 14, pillY + 17);
  const oc = bill.outstanding > 0 ? RED_ON_DARK : GREEN_ON_DARK;
  doc.setTextColor(oc[0], oc[1], oc[2]);
  doc.setFontSize(14.5);
  doc.text(money(bill.outstanding), bx + bw - 14, pillY + 32, { align: 'right' });

  // signature block (left)
  const sigY = pillY + 34;
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('For ' + FARM.name, 40, signature ? sigY - 58 : sigY - 24);
  if (signature) {
    try {
      const props = doc.getImageProperties(signature);
      const sw = 118;
      const sh = (props.height / props.width) * sw;
      // ink sits just above the signatory rule
      doc.addImage(signature, 'PNG', 46, sigY - 8 - sh, sw, sh);
    } catch {
      /* fall back to the plain line */
    }
  }
  doc.setDrawColor(150, 142, 120);
  doc.setLineWidth(0.8);
  doc.line(40, sigY, 190, sigY);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.setFontSize(8.2);
  doc.text('Authorised Signatory', 40, sigY + 12);

  // ============ footer (on every page) ============
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.8);
    doc.line(40, H - 54, W - 40, H - 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Thank you for choosing ' + FARM.name + ' — ' + FARM.tagline2, W / 2, H - 40, { align: 'center' });
    doc.setFontSize(7.6);
    doc.text('Instagram: @aryavart_farm   ·   YouTube: @aryavartdairyfarm   ·   ' + FARM.phone, W / 2, H - 28, { align: 'center' });
    doc.text('Page ' + i + ' / ' + pageCount, W - 40, H - 28, { align: 'right' });
  }

  const safeName = (bill.customerName || 'customer').replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save('ADF-Bill-' + safeName + '-' + bill.from + '_to_' + bill.to + '.pdf');
}
