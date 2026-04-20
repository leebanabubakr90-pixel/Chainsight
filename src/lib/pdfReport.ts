import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Shipment = {
  tracking_code: string;
  product: string;
  origin: string;
  destination: string;
  carrier: string | null;
  status: string;
  units: number;
  cost: number | null;
  eta: string | null;
  risk_score: number | null;
};

type Bottleneck = {
  severity: string;
  title: string;
  description: string | null;
  suggested_action: string | null;
};

export function generateSupplyChainReport(opts: {
  orgName: string;
  shipments: Shipment[];
  bottlenecks: Bottleneck[];
  summary?: string;
}) {
  const { orgName, shipments, bottlenecks, summary } = opts;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(20, 224, 207);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ChainSight", 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(180, 200, 220);
  doc.setFont("helvetica", "normal");
  doc.text("Supply Chain Intelligence Report", 14, 22);
  doc.text(new Date().toLocaleString(), pageWidth - 14, 22, { align: "right" });

  // Org & summary
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Organization: ${orgName}`, 14, 44);

  // Stats
  const total = shipments.length;
  const inTransit = shipments.filter((s) => s.status === "in_transit").length;
  const delayed = shipments.filter((s) => s.status === "delayed").length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;
  const totalCost = shipments.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 80);
  let y = 52;
  doc.text(`Total shipments: ${total}`, 14, y);
  doc.text(`In transit: ${inTransit}`, 70, y);
  doc.text(`Delayed: ${delayed}`, 120, y);
  doc.text(`Delivered: ${delivered}`, 160, y);
  y += 6;
  doc.text(`Total spend: $${totalCost.toLocaleString()}`, 14, y);

  if (summary) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Executive Summary", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 80);
    const lines = doc.splitTextToSize(summary, pageWidth - 28);
    doc.text(lines, 14, y + 6);
    y += 6 + lines.length * 5;
  }

  // Shipments table
  autoTable(doc, {
    startY: y + 8,
    head: [["Tracking", "Product", "Route", "Carrier", "Status", "Units", "Risk"]],
    body: shipments.slice(0, 50).map((s) => [
      s.tracking_code,
      s.product,
      `${s.origin} → ${s.destination}`,
      s.carrier || "—",
      s.status,
      String(s.units),
      `${Number(s.risk_score || 0).toFixed(0)}%`,
    ]),
    headStyles: { fillColor: [20, 184, 166], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [240, 248, 250] },
  });

  // Bottlenecks
  if (bottlenecks.length) {
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Detected Bottlenecks", 14, finalY);
    autoTable(doc, {
      startY: finalY + 4,
      head: [["Severity", "Title", "Description", "Suggested Action"]],
      body: bottlenecks.map((b) => [
        b.severity.toUpperCase(),
        b.title,
        b.description || "—",
        b.suggested_action || "—",
      ]),
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(`Page ${i} of ${pages}  •  ChainSight AI Report`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

  doc.save(`chainsight-report-${Date.now()}.pdf`);
}