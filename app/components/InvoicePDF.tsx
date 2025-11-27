import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "~/lib/utils";

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#666",
  },
  dateSection: {
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  addressBlock: {
    width: "45%",
  },
  addressLine: {
    fontSize: 10,
    marginBottom: 3,
  },
  addressName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
  },
  tableCell: {
    fontSize: 10,
    color: "#1f2937",
  },
  itemName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 3,
  },
  itemDescription: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.4,
  },
  descriptionCol: {
    width: "45%",
  },
  rateCol: {
    width: "20%",
    textAlign: "right",
  },
  qtyCol: {
    width: "15%",
    textAlign: "right",
  },
  amountCol: {
    width: "20%",
    textAlign: "right",
  },
  totalsSection: {
    marginLeft: "auto",
    width: "40%",
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  balanceDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  balanceDueLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#059669",
  },
  balanceDueValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#059669",
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 20,
  },
  notesText: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

interface InvoicePDFProps {
  invoice: any;
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.dateSection}>
            <Text style={styles.addressLine}>
              <Text style={{ fontWeight: "bold" }}>Date: </Text>
              {formatDate(invoice.date)}
            </Text>
            {invoice.terms && (
              <Text style={styles.addressLine}>
                <Text style={{ fontWeight: "bold" }}>Terms: </Text>
                {invoice.terms.replace(/_/g, " ")}
              </Text>
            )}
          </View>
        </View>

        {/* From and Bill To */}
        <View style={styles.addressSection}>
          {/* From */}
          <View style={styles.addressBlock}>
            <Text style={styles.sectionTitle}>From</Text>
            {invoice.from_name && <Text style={styles.addressName}>{invoice.from_name}</Text>}
            {invoice.from_address && <Text style={styles.addressLine}>{invoice.from_address}</Text>}
            {invoice.from_email && <Text style={styles.addressLine}>{invoice.from_email}</Text>}
            {invoice.from_phone && <Text style={styles.addressLine}>{invoice.from_phone}</Text>}
            {invoice.from_business_number && (
              <Text style={styles.addressLine}>Business #: {invoice.from_business_number}</Text>
            )}
            {invoice.from_website && <Text style={styles.addressLine}>{invoice.from_website}</Text>}
            {invoice.from_owner && <Text style={styles.addressLine}>Owner: {invoice.from_owner}</Text>}
          </View>

          {/* Bill To */}
          <View style={styles.addressBlock}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            {invoice.bill_to_name && <Text style={styles.addressName}>{invoice.bill_to_name}</Text>}
            {invoice.bill_to_address && <Text style={styles.addressLine}>{invoice.bill_to_address}</Text>}
            {invoice.bill_to_email && <Text style={styles.addressLine}>{invoice.bill_to_email}</Text>}
            {invoice.bill_to_phone && <Text style={styles.addressLine}>Phone: {invoice.bill_to_phone}</Text>}
            {invoice.bill_to_mobile && <Text style={styles.addressLine}>Mobile: {invoice.bill_to_mobile}</Text>}
            {invoice.bill_to_fax && <Text style={styles.addressLine}>Fax: {invoice.bill_to_fax}</Text>}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.rateCol]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {lineItems.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.descriptionCol]}>
                <Text style={styles.itemName}>{item.name || item.description}</Text>
                {item.name && item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.rateCol]}>
                ${formatCurrency(parseFloat(item.rate || 0))}
              </Text>
              <Text style={[styles.tableCell, styles.qtyCol]}>
                {parseFloat(item.quantity || 0).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, styles.amountCol]}>
                ${formatCurrency(parseFloat(item.amount || 0))}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${formatCurrency(invoice.subtotal)}</Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>${formatCurrency(invoice.total)}</Text>
          </View>

          <View style={styles.balanceDueRow}>
            <Text style={styles.balanceDueLabel}>Balance Due:</Text>
            <Text style={styles.balanceDueValue}>${formatCurrency(invoice.balance_due)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Figurely • {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}
