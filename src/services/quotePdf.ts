import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Quote, Company } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'

export function generateQuotePdf(quote: Quote, company: Company | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Top emerald accent bar
  doc.setFillColor(5, 150, 105) // emerald-600
  doc.rect(0, 0, pageWidth, 5, 'F')

  // Top company header box
  doc.setFillColor(248, 250, 252) // slate-50
  doc.rect(0, 5, pageWidth, 32, 'F')

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(0, 37, pageWidth, 37)

  // Company Name & details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  const companyName = company?.trade_name || company?.legal_name || 'Automação Empresarial'
  doc.text(companyName, 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  const cnpjLine = company?.cnpj ? `CNPJ: ${company.cnpj}` : ''
  const phoneLine = company?.phone ? ` • Tel: ${company.phone}` : ''
  const emailLine = company?.contact_email ? ` • E-mail: ${company.contact_email}` : ''
  doc.text(`${cnpjLine}${phoneLine}${emailLine}`, 14, 22)

  const cityState =
    company?.city && company?.state
      ? `${company.address || ''}, ${company.city}/${company.state}`
      : ''
  if (cityState) {
    doc.text(cityState, 14, 27)
  }

  // Quote badge on header right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(5, 150, 105)
  doc.text(`PROPOSTA / ORÇAMENTO`, pageWidth - 14, 16, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Nº: ${quote.quote_number || quote.id.slice(0, 8).toUpperCase()}`, pageWidth - 14, 22, {
    align: 'right',
  })
  doc.text(`Emissão: ${formatDatePtBr(quote.issue_date)}`, pageWidth - 14, 27, { align: 'right' })
  if (quote.valid_until) {
    doc.text(`Validade: ${formatDatePtBr(quote.valid_until)}`, pageWidth - 14, 32, {
      align: 'right',
    })
  }

  // Customer box
  let currentY = 44
  doc.setFillColor(241, 245, 249) // slate-100
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'F')
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text('DADOS DO CLIENTE', 18, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const clientName = quote.expand?.customer_id?.name || quote.customer_name || 'Cliente Geral'
  doc.text(`Cliente: ${clientName}`, 18, currentY + 12)

  const docLine = quote.expand?.customer_id?.document
    ? `CPF/CNPJ: ${quote.expand.customer_id.document}`
    : ''
  const contactLine =
    quote.customer_contact ||
    quote.expand?.customer_id?.phone ||
    quote.expand?.customer_id?.email ||
    ''
  doc.text(`${docLine} ${contactLine ? `• Contato: ${contactLine}` : ''}`, 18, currentY + 17)

  currentY += 28

  // Title of the quote
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`Objeto / Descrição: ${quote.title}`, 14, currentY)
  currentY += 4

  // Items table
  const items = Array.isArray(quote.items) ? quote.items : []
  const tableRows = items.map((it, idx) => [
    String(idx + 1),
    it.name + (it.sku ? ` (${it.sku})` : ''),
    `${it.quantity} un`,
    formatCurrency(it.unit_price),
    formatCurrency(it.total),
  ])

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    head: [['#', 'Item / Descrição', 'Qtd', 'Preço Unitário', 'Total']],
    body:
      tableRows.length > 0
        ? tableRows
        : [
            [
              '1',
              quote.title,
              '1 un',
              formatCurrency(quote.total_amount),
              formatCurrency(quote.total_amount),
            ],
          ],
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
  })

  currentY = (doc as any).lastAutoTable.finalY + 6

  // Total summary box (right aligned)
  const totalBoxWidth = 70
  const totalBoxX = pageWidth - 14 - totalBoxWidth

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, 24, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, 24, 2, 2, 'S')

  if (quote.subtotal && quote.discount) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Subtotal: ${formatCurrency(quote.subtotal)}`, totalBoxX + 4, currentY + 6)
    doc.text(`Desconto: - ${formatCurrency(quote.discount)}`, totalBoxX + 4, currentY + 11)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(5, 150, 105)
  doc.text(`TOTAL: ${formatCurrency(quote.total_amount)}`, totalBoxX + 4, currentY + 19)

  // Conditions and Notes
  currentY += 30
  if (quote.payment_terms || quote.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text('Condições Comerciais & Observações:', 14, currentY)
    currentY += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)

    if (quote.payment_terms) {
      doc.text(`• Condições de Pagamento: ${quote.payment_terms}`, 14, currentY)
      currentY += 4.5
    }
    if (quote.notes) {
      const splitNotes = doc.splitTextToSize(`• ${quote.notes}`, pageWidth - 28)
      doc.text(splitNotes, 14, currentY)
    }
  }

  // Footer / Page numbers
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'Este documento é uma proposta comercial sem valor fiscal imediato.',
      14,
      pageHeight - 8,
    )
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' })
  }

  const filename = `orcamento_${quote.quote_number || quote.id.slice(0, 6)}_${quote.issue_date}.pdf`
  doc.save(filename)
}
