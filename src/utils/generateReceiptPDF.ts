import jsPDF from "jspdf";

export type ReceiptData = {
  businessName: string;
  businessAddress?: string;
  orderNumber: string;
  tableNumber: string;
  dateTime: Date;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
    selectedOptions?: {
      groupName: string;
      optionName: string;
      priceModifier: number;
    }[];
  }[];
  subtotal: number;
  discount: number;
  discountLabel: string;
  total: number;
  paymentMethod?: string;
  isPaid?: boolean;
};

export function generateReceiptPDF(data: ReceiptData): void {
  // Create PDF with 80mm width (thermal receipt standard)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 200], // 80mm width, auto height
  });

  let yPosition = 10;
  const pageWidth = 80;
  const leftMargin = 4;
  const rightMargin = 4;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Helper function to format peso amounts
  const formatPeso = (amount: number): string => `P ${amount.toFixed(2)}`;

  // Helper function to position right-aligned text
  const addRightAlignedText = (text: string, xPos: number, yPos: number, fontSize: number = 8) => {
    doc.setFontSize(fontSize);
    const textWidth = (doc.getStringUnitWidth(text) * fontSize) / doc.internal.scaleFactor;
    doc.text(text, xPos - textWidth, yPos);
  };

  // Set default font
  doc.setFont("helvetica");

  // Business Name
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const businessNameLines = doc.splitTextToSize(data.businessName, contentWidth);
  businessNameLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 5;
  });

  // Business Address
  if (data.businessAddress) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(data.businessAddress, contentWidth);
    addressLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 3;
    });
  }

  // Divider
  yPosition += 2;
  doc.setDrawColor(200);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 3;

  // Order Info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Order #: ${data.orderNumber}`, leftMargin, yPosition);
  yPosition += 4;
  doc.text(`Table: ${data.tableNumber}`, leftMargin, yPosition);
  yPosition += 4;
  doc.text(
    `Date: ${data.dateTime.toLocaleDateString()}`,
    leftMargin,
    yPosition
  );
  yPosition += 4;
  doc.text(
    `Time: ${data.dateTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    leftMargin,
    yPosition
  );
  yPosition += 3;

  // Divider
  yPosition += 2;
  doc.setDrawColor(200);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 3;

  // Items Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Item", leftMargin, yPosition);
  doc.text("Qty", pageWidth - rightMargin - 18, yPosition);
  doc.text("Total", pageWidth - rightMargin - 2, yPosition, { align: "right" });
  yPosition += 4;

  // Divider
  doc.setDrawColor(200);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 3;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.items.forEach((item) => {
    // Item name - wrap to fit available width
    const itemNameLines = doc.splitTextToSize(
      item.name,
      pageWidth - rightMargin - 28
    );
    
    // First line: item name + qty + total
    doc.text(itemNameLines[0] || "", leftMargin, yPosition);
    doc.text(`x${item.quantity}`, pageWidth - rightMargin - 18, yPosition);
    addRightAlignedText(formatPeso(item.total), pageWidth - rightMargin, yPosition);
    yPosition += 3;

    // Additional item name lines
    for (let i = 1; i < itemNameLines.length; i++) {
      doc.text(itemNameLines[i], leftMargin, yPosition);
      yPosition += 3;
    }

    // Selected Options
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      item.selectedOptions.forEach((opt) => {
        const optLine = `${opt.groupName}: ${opt.optionName}`;
        const optLines = doc.splitTextToSize(
          optLine,
          pageWidth - rightMargin - 18
        );
        
        // Print option text
        optLines.forEach((line: string, lineIdx: number) => {
          doc.text(line, leftMargin + 2, yPosition);
          
          // Add price modifier only on first line
          if (lineIdx === 0 && opt.priceModifier > 0) {
            addRightAlignedText(`+P ${opt.priceModifier.toFixed(2)}`, pageWidth - rightMargin, yPosition, 7);
          }
          yPosition += 2.5;
        });
      });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      yPosition += 1;
    }
  });

  // Divider
  yPosition += 2;
  doc.setDrawColor(200);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 3;

  // Totals
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  // Subtotal
  doc.text("Subtotal:", leftMargin, yPosition);
  addRightAlignedText(formatPeso(data.subtotal), pageWidth - rightMargin, yPosition);
  yPosition += 4;

  // Discount
  if (data.discount > 0) {
    doc.text(`${data.discountLabel}:`, leftMargin, yPosition);
    addRightAlignedText(`-${formatPeso(data.discount)}`, pageWidth - rightMargin, yPosition);
    yPosition += 4;
  }

  // Divider
  doc.setDrawColor(200);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 3;

  // Total (Bold)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", leftMargin, yPosition);
  addRightAlignedText(formatPeso(data.total), pageWidth - rightMargin, yPosition, 10);
  yPosition += 5;

  // Payment Status
  if (data.isPaid !== undefined) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const paymentStatus = data.isPaid ? "PAID" : "UNPAID";
    doc.text(
      `Payment: ${paymentStatus}${data.paymentMethod ? ` (${data.paymentMethod.toUpperCase()})` : ""}`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    yPosition += 4;
  }

  // Divider
  yPosition += 2;
  doc.setDrawColor(200);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 3;

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 3;
  doc.text(
    "Please come again",
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );

  // Download PDF
  const fileName = `Receipt-${data.orderNumber}-${new Date().getTime()}.pdf`;
  doc.save(fileName);
}
