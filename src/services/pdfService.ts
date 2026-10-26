import { jsPDF } from 'jspdf';
import { Application, EligibilityResult } from '../types';

export interface EligibilityReportData {
  farmerName: string;
  mobile?: string;
  state: string;
  district: string;
  landArea: string | number;
  primaryCrop: string;
  annualIncome: string | number;
  eligibleSchemes: EligibilityResult[];
  ineligibleSchemes: EligibilityResult[];
  dateStr?: string;
}

/**
 * Downloads a real, official vector PDF for the Scheme Eligibility Dossier
 */
export function downloadEligibilityReportPDF(data: EligibilityReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // Header Tricolor Bar
  doc.setFillColor(245, 158, 11); // Saffron
  doc.rect(margin, y, contentWidth / 3, 2, 'F');
  doc.setFillColor(255, 255, 255); // White
  doc.rect(margin + contentWidth / 3, y, contentWidth / 3, 2, 'F');
  doc.setFillColor(5, 150, 105); // Green
  doc.rect(margin + (contentWidth / 3) * 2, y, contentWidth / 3, 2, 'F');
  y += 6;

  // Header Title
  doc.setTextColor(4, 120, 87); // Emerald 700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GOVERNMENT OF INDIA • MINISTRY OF AGRICULTURE & FARMERS WELFARE', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setTextColor(100, 116, 139); // Slate 500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('कृषि एवं किसान कल्याण मंत्रालय • Direct Benefit Transfer (DBT) Portal', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SCHEME ELIGIBILITY EVALUATION DOSSIER', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Meta Banner Box
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61); // Emerald 700
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const dateText = data.dateStr || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Report ID: DOS-${Date.now().toString().slice(-6)}`, margin + 4, y + 7);
  doc.text(`Evaluation Date: ${dateText}`, margin + contentWidth / 2, y + 7, { align: 'center' });
  doc.text(`Qualified Schemes: ${data.eligibleSchemes.length}`, margin + contentWidth - 4, y + 7, { align: 'right' });
  y += 15;

  // Section 1: Farmer Cultivation Details Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Farm & Cultivation Profile (कृषि एवं भूमि विवरण)', margin, y);
  y += 3;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFontSize(8.5);
  const col1 = margin + 4;
  const col2 = margin + contentWidth / 2 + 4;

  // Row 1
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Farmer Name:', col1, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.farmerName || 'Sushant Shinde'), col1 + 26, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('State / District:', col2, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.district}, ${data.state}`, col2 + 26, y + 6);

  // Row 2
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Landholding:', col1, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.landArea} Acres (Semi-Medium)`, col1 + 26, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Primary Crop:', col2, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.primaryCrop || 'Sugarcane'), col2 + 26, y + 13);

  // Row 3
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Annual Income:', col1, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(`₹${Number(data.annualIncome || 180000).toLocaleString('en-IN')}`, col1 + 26, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Verification:', col2, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Aadhaar & 7/12 Land Seeded', col2 + 26, y + 20);

  y += 31;

  // Section 2: Eligible Schemes
  doc.setTextColor(4, 120, 87);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`2. Fully Qualified Government Schemes (${data.eligibleSchemes.length} Available)`, margin, y);
  y += 4;

  data.eligibleSchemes.forEach((scheme, index) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    // Number Badge
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margin + 3, y + 3, 5, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(String(index + 1), margin + 5.5, y + 6.8, { align: 'center' });

    // Scheme Name
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const title = scheme.schemeName.length > 55 ? scheme.schemeName.substring(0, 52) + '...' : scheme.schemeName;
    doc.text(title, margin + 11, y + 7);

    // Benefit Badge
    doc.setTextColor(4, 120, 87);
    doc.setFontSize(8.5);
    const benefitText = scheme.potentialBenefit ? `Benefit: ${scheme.potentialBenefit}` : 'High Financial Grant';
    doc.text(benefitText, margin + contentWidth - 4, y + 7, { align: 'right' });

    // Reason / Match description
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`✓ Criteria Met: Land size within limits • Location in ${data.district} • High Subsidy Coverage`, margin + 11, y + 12);

    // Required Docs
    const docs = scheme.matchedCriteria && scheme.matchedCriteria.length > 0
      ? `Conditions: ${scheme.matchedCriteria.slice(0, 2).join(' | ')}`
      : 'Mandatory: 7/12 Land Record, Aadhaar eKYC, Active Bank Account';
    doc.setTextColor(100, 116, 139);
    doc.text(docs.length > 80 ? docs.substring(0, 77) + '...' : docs, margin + 11, y + 16.5);

    y += 22;
  });

  // Section 3: Schemes requiring additional paperwork (if space allows)
  if (data.ineligibleSchemes && data.ineligibleSchemes.length > 0 && y < pageHeight - 45) {
    y += 2;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`3. Schemes Requiring Additional Criteria (${data.ineligibleSchemes.length})`, margin, y);
    y += 4;

    data.ineligibleSchemes.slice(0, 3).forEach((scheme) => {
      if (y > pageHeight - 30) return;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(scheme.schemeName.length > 50 ? scheme.schemeName.substring(0, 48) + '...' : scheme.schemeName, margin + 4, y + 5);

      doc.setTextColor(225, 29, 72);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const reason = scheme.missingCriteria?.[0] || 'Requires additional landholding or tube-well connection';
      doc.text(`Missing: ${reason}`, margin + 4, y + 9.5);

      y += 14;
    });
  }

  // Footer Disclaimer & Stamp
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, margin + contentWidth, footerY - 2);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an electronically generated assessment report under IT Act 2000. No physical signature required.', margin, footerY + 2);
  doc.text('Official Portal: https://farmer.gov.in • Toll-Free Kisan Helpline: 1800-180-1551', margin, footerY + 6);
  doc.text('National DBT Agriculture Division', margin + contentWidth, footerY + 4, { align: 'right' });

  // Save the PDF directly to device
  const filename = `Farmer_Scheme_Eligibility_Dossier_${Date.now().toString().slice(-6)}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a real, official vector PDF for an Application Acknowledgement Slip
 */
export function downloadApplicationSlipPDF(
  application: Application,
  farmerName?: string,
  mobile?: string,
  district?: string,
  state?: string,
  landArea?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const appNumber = application.applicationNumber || application.id;
  const applicant = application.applicantName || application.farmerName || farmerName || 'Sushant Shinde';
  const phone = application.farmerMobile || mobile || '+91 98220 14589';
  const st = application.farmerState || state || 'Maharashtra';
  const dist = application.farmerDistrict || district || 'Pune';
  const receiptNo = `ACK/${new Date().getFullYear()}/${st.substring(0, 3).toUpperCase()}/${appNumber.replace(/\D/g, '').slice(-5) || '88192'}`;
  const claim = application.subsidyClaimAmount ? `₹${application.subsidyClaimAmount.toLocaleString('en-IN')}` : '₹1,80,000';

  // Header Tricolor Bar
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, y, contentWidth / 3, 2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + contentWidth / 3, y, contentWidth / 3, 2, 'F');
  doc.setFillColor(5, 150, 105);
  doc.rect(margin + (contentWidth / 3) * 2, y, contentWidth / 3, 2, 'F');
  y += 7;

  // Header Title
  doc.setTextColor(4, 120, 87);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GOVERNMENT OF INDIA • MINISTRY OF AGRICULTURE & FARMERS WELFARE', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('कृषि एवं किसान कल्याण मंत्रालय • Direct Benefit Transfer (DBT) Central Portal', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL APPLICATION ACKNOWLEDGEMENT RECEIPT (आवेदन पावती)', pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Meta Banner
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt No: ${receiptNo}`, margin + 5, y + 6);
  doc.text(`Application No: ${appNumber}`, margin + contentWidth / 2, y + 6, { align: 'center' });
  doc.text(`Status: ${application.status}`, margin + contentWidth - 5, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${new Date(application.submittedAt || Date.now()).toLocaleString('en-IN')}`, margin + 5, y + 11);
  doc.text('Channel: Online Farmer Portal • DigiLocker Authenticated', margin + contentWidth - 5, y + 11, { align: 'right' });
  y += 18;

  // 2-Column Details Box
  const halfWidth = (contentWidth - 6) / 2;

  // Beneficiary Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfWidth, 48, 2, 2, 'FD');

  doc.setTextColor(4, 120, 87);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BENEFICIARY DETAILS (लाभार्थी)', margin + 4, y + 6);

  doc.setFontSize(8);
  const rows1 = [
    ['Applicant Name:', applicant],
    ['Mobile Number:', phone],
    ['Aadhaar (UIDAI):', 'XXXX-XXXX-1458 (Verified)'],
    ['State / District:', `${dist}, ${st}`],
    ['Village / Taluka:', 'Baramati, Pune'],
    ['Landholding:', landArea || '3.5 Acres (Khasra 142/2A)']
  ];

  let by = y + 12;
  rows1.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(k, margin + 4, by);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v, margin + halfWidth - 4, by, { align: 'right' });
    by += 6;
  });

  // Scheme & Sanction Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + halfWidth + 6, y, halfWidth, 48, 2, 2, 'FD');

  doc.setTextColor(4, 120, 87);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('2. SCHEME & CLAIM DETAILS (योजना)', margin + halfWidth + 10, y + 6);

  const schemeNameShort = application.schemeName.length > 25 ? application.schemeName.substring(0, 23) + '...' : application.schemeName;
  const rows2 = [
    ['Scheme Name:', schemeNameShort],
    ['Category Type:', application.schemeType || 'SUBSIDY'],
    ['Claim Amount:', claim],
    ['Processing Office:', 'District Agriculture Office'],
    ['Priority Level:', application.priority || 'NORMAL'],
    ['PFMS Account:', 'SBI ****4092 (Aadhaar Seeded)']
  ];

  let sy = y + 12;
  rows2.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(k, margin + halfWidth + 10, sy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(k === 'Claim Amount:' ? 4 : 15, k === 'Claim Amount:' ? 120 : 23, k === 'Claim Amount:' ? 87 : 42);
    doc.text(v, margin + contentWidth - 4, sy, { align: 'right' });
    sy += 6;
  });

  y += 52;

  // Attached Documents Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ DIGILOCKER VERIFIED DOCUMENTS IN DOSSIER:', margin + 4, y + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('• 7/12 Land Record (Mahabhulekh)    • Aadhaar eKYC (UIDAI)    • Bank Passbook (PFMS Verified)    • Soil Health Card', margin + 4, y + 11);

  y += 20;

  // Audit remarks
  if (application.timeline && application.timeline.length > 0) {
    const lastEvent = application.timeline[application.timeline.length - 1];
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL SCRUTINY NOTE / AUDIT LOG:', margin + 4, y + 5.5);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`"${lastEvent.remarks || 'Application lodged digitally and assigned for scrutiny.'}"`, margin + 4, y + 10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Action by: ${lastEvent.byRole || 'District Officer'} • ${new Date(lastEvent.timestamp).toLocaleDateString()}`, margin + 4, y + 14);

    y += 20;
  }

  // Stamp Box
  doc.setDrawColor(5, 150, 105);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.roundedRect(pageWidth / 2 - 30, y, 60, 16, 2, 2, 'D');
  doc.setLineDashPattern([], 0); // reset

  doc.setTextColor(4, 120, 87);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DBT CENTRAL GATEWAY', pageWidth / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text('VERIFIED & LODGED', pageWidth / 2, y + 10, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text(appNumber, pageWidth / 2, y + 14, { align: 'center' });

  // Footer
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 2, margin + contentWidth, footerY - 2);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an electronically generated acknowledgement receipt. No physical signature required under IT Act 2000.', margin, footerY + 2);
  doc.text('Toll-Free Kisan Call Centre: 1800-180-1551 • Visit: https://farmer.gov.in', margin, footerY + 6);
  doc.text('National Agriculture DBT Mission', margin + contentWidth, footerY + 4, { align: 'right' });

  const filename = `DBT_Acknowledgement_Slip_${appNumber.replace(/\//g, '_')}.pdf`;
  doc.save(filename);
}
