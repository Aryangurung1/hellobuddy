import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Invoice } from "../types/invoice";
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generatePDFFile(invoice: Invoice, fileName: string) {
  // Create new PDF document
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.text("Invoice", 14, 22);

  // Add invoice details
  doc.setFontSize(12);
  const details = [
    ["Invoice ID:", invoice.id],
    ["Customer:", invoice.user.email],
    ["Amount:", `${invoice.currency} ${invoice.amount}`],
    ["Payment Method:", invoice.paymentMethod],
    ["Date:", new Date(invoice.createdAt).toLocaleDateString()],
    [
      "Subscription Period:",
      `${new Date(
        invoice.subscriptionPeriodStart
      ).toLocaleDateString()} - ${new Date(
        invoice.subscriptionPeriodEnd
      ).toLocaleDateString()}`,
    ],
    ["Status:", invoice.status],
  ];

  // Add table
  doc.autoTable({
    startY: 30,
    head: [["Item", "Details"]],
    body: details,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66] },
    styles: { fontSize: 10 },
  });

  // Save PDF
  doc.save(`${fileName}.pdf`);
}
