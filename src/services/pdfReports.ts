import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Company } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'

interface HeaderConfig {
  doc: jsPDF
  company?: Company | null
  title: string
  subtitle: string
  period?: string
}

function drawHeader({ doc, company, title, subtitle, period }: HeaderConfig): number {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Top emerald accent bar
  doc.setFillColor(5, 150, 105) // emerald-600
  doc.rect(0, 0, pageWidth, 5, 'F')

  // Top company header box
  doc.setFillColor(248, 250, 252) // slate-50
  doc.rect(0, 5, pageWidth, 28, 'F')

  doc.setDrawColor(226, 232, 240) // slate-200
  doc.setLineWidth(0.5)
  doc.line(0, 33, pageWidth, 33)

  // Se a empresa possui logotipo, desenhar indicação visual limpa no PDF
  // Company Name & CNPJ
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42) // slate-900
  const companyName = company?.trade_name || company?.legal_name || 'Automação Empresarial'
  doc.text(companyName, 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139) // slate-500
  const cnpjLine = company?.cnpj ? `CNPJ: ${company.cnpj}` : 'ERP Empresarial'
  const cityLine = company?.city && company?.state ? ` • ${company.city}/${company.state}` : ''
  doc.text(`${cnpjLine}${cityLine}`, 14, 22)

  // Emissão & Período (alinhado à direita)
  const nowStr = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date())
  doc.setFontSize(8)
  doc.text(`Gerado em: ${nowStr}`, pageWidth - 14, 16, { align: 'right' })
  if (period) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105)
    doc.text(`Período: ${period}`, pageWidth - 14, 22, { align: 'right' })
  }

  // Title section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(title, 14, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(subtitle, 14, 47)

  return 52 // Y de início do conteúdo
}

function applyPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text('Automação Empresarial ERP • Relatório Oficial', 14, pageHeight - 7)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' })
  }
}

// 1. Exportar Resumo Mensal Consolidado em PDF
export interface MonthlyPdfData {
  company: Company | null
  year: number
  monthName: string
  totalReceitas: number
  totalReceitasRecebidas: number
  totalReceitasPendentes: number
  totalDespesas: number
  totalDespesasPagas: number
  totalDespesasPendentes: number
  totalVendas: number
  resultadoOperacional: number
  margemOperacional: number
  expensesByCategory: [string, number][]
  entries: {
    entry_date: string
    description: string
    category: string
    status: string
    amount: number
  }[]
  expenses: {
    expense_date: string
    description: string
    category: string
    status: string
    amount: number
  }[]
  pendingPayables?: {
    due_date: string
    description: string
    supplier?: string
    amount: number
  }[]
  pendingReceivables?: {
    due_date: string
    description: string
    clientName?: string
    amount: number
  }[]
}

export function generateMonthlyReportPdf(data: MonthlyPdfData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const period = `${data.monthName} de ${data.year}`

  let currentY = drawHeader({
    doc,
    company: data.company,
    title: 'Demonstrativo Financeiro & Resumo Mensal',
    subtitle:
      'Resultado operacional, margens, centro de custos e detalhamento de receitas e despesas.',
    period,
  })

  // Bloco de Cartões Resumo DRE (4 caixas)
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxWidth = (pageWidth - 28 - 9) / 4 // 4 caixas com espaçamento de 3mm
  const boxHeight = 18

  const summaryCards = [
    {
      label: 'Receitas Totais',
      val: formatCurrency(data.totalReceitas),
      sub: `Recebido: ${formatCurrency(data.totalReceitasRecebidas)}`,
      color: [5, 150, 105], // emerald-600
    },
    {
      label: 'Despesas / Custos',
      val: formatCurrency(data.totalDespesas),
      sub: `Quitado: ${formatCurrency(data.totalDespesasPagas)}`,
      color: [220, 38, 38], // red-600
    },
    {
      label: 'Resultado Líquido',
      val: formatCurrency(data.resultadoOperacional),
      sub: `Margem: ${data.margemOperacional}%`,
      color: data.resultadoOperacional >= 0 ? [5, 150, 105] : [220, 38, 38],
    },
    {
      label: 'Vendas do Mês',
      val: formatCurrency(data.totalVendas),
      sub: 'Total comercial faturado',
      color: [30, 41, 59], // slate-800
    },
  ]

  summaryCards.forEach((card, idx) => {
    const x = 14 + idx * (boxWidth + 3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'S')

    // Top color strip inside card
    doc.setFillColor(card.color[0], card.color[1], card.color[2])
    doc.rect(x, currentY, boxWidth, 1.5, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(card.label.toUpperCase(), x + 3, currentY + 5.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(card.color[0], card.color[1], card.color[2])
    doc.text(card.val, x + 3, currentY + 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(card.sub, x + 3, currentY + 15)
  })

  currentY += boxHeight + 6

  // Tabela 1: Quebra de Despesas por Centro de Custo
  if (data.expensesByCategory.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text('1. Detalhamento de Despesas por Categoria', 14, currentY)
    currentY += 2

    const categoryRows = data.expensesByCategory.map(([cat, val]) => {
      const pct =
        data.totalDespesas > 0 ? ((val / data.totalDespesas) * 100).toFixed(1) + '%' : '0%'
      return [cat, pct, formatCurrency(val)]
    })

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['Categoria / Centro de Custo', 'Representação (%)', 'Valor']],
      body: categoryRows,
      foot: [['Total de Despesas', '100%', formatCurrency(data.totalDespesas)]],
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 40 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // Tabela 2: Receitas do Mês
  if (data.entries.length > 0) {
    if (currentY > 240) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`2. Receitas Realizadas no Mês (${data.entries.length} lançamentos)`, 14, currentY)
    currentY += 2

    const entryRows = data.entries.map((e) => [
      formatDatePtBr(e.entry_date),
      e.description,
      e.category || 'Geral',
      e.status,
      formatCurrency(e.amount),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['Data', 'Descrição', 'Categoria', 'Status', 'Valor']],
      body: entryRows,
      foot: [['', 'Total de Receitas', '', '', formatCurrency(data.totalReceitas)]],
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [236, 253, 245],
        textColor: [6, 95, 70],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32 },
        3: { cellWidth: 24, halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // Tabela 3: Despesas Detalhadas do Mês
  if (data.expenses.length > 0) {
    if (currentY > 240) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`3. Despesas do Mês (${data.expenses.length} lançamentos)`, 14, currentY)
    currentY += 2

    const expenseRows = data.expenses.map((ex) => [
      formatDatePtBr(ex.expense_date),
      ex.description,
      ex.category || 'Geral',
      ex.status,
      formatCurrency(ex.amount),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['Data', 'Descrição', 'Categoria', 'Status', 'Valor']],
      body: expenseRows,
      foot: [['', 'Total de Despesas', '', '', formatCurrency(data.totalDespesas)]],
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [254, 242, 242],
        textColor: [153, 27, 27],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32 },
        3: { cellWidth: 24, halign: 'center' },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  }

  // Tabela 4: Contas Pendentes (se houver títulos em aberto no relatório mensal)
  const hasPending =
    (data.pendingPayables && data.pendingPayables.length > 0) ||
    (data.pendingReceivables && data.pendingReceivables.length > 0)

  if (hasPending) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text('4. Contas a Pagar & Receber Pendentes no Período', 14, currentY)
    currentY += 2

    const pendingRows: any[] = []
    let totalPagar = 0
    let totalReceber = 0

    ;(data.pendingPayables || []).forEach((p) => {
      totalPagar += p.amount
      pendingRows.push([
        'A Pagar',
        formatDatePtBr(p.due_date),
        p.description,
        p.supplier || 'Fornecedor',
        '- ' + formatCurrency(p.amount),
      ])
    })
    ;(data.pendingReceivables || []).forEach((r) => {
      totalReceber += r.amount
      pendingRows.push([
        'A Receber',
        formatDatePtBr(r.due_date),
        r.description,
        r.clientName || 'Cliente',
        '+ ' + formatCurrency(r.amount),
      ])
    })

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['Tipo', 'Vencimento', 'Descrição', 'Fornecedor / Cliente', 'Valor']],
      body: pendingRows,
      foot: [
        [
          '',
          '',
          `Totais: Pagar ${formatCurrency(totalPagar)} | Receber ${formatCurrency(totalReceber)}`,
          'Saldo Previsto',
          formatCurrency(totalReceber - totalPagar),
        ],
      ],
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
      },
    })
  }

  applyPageNumbers(doc)
  doc.save(`resumo_mensal_${data.year}_${data.monthName.toLowerCase()}.pdf`)
}

// 2. Exportar Relatório de Vencimentos Futuros em PDF
export interface VencimentoItem {
  id: string
  tipo: 'A Pagar' | 'A Receber'
  descricao: string
  contraparte: string
  vencimento: string
  valor: number
}

export interface VencimentoGroupData {
  title: string
  items: VencimentoItem[]
  stats: {
    pagar: number
    receber: number
    saldo: number
    total: number
  }
}

export interface VencimentosPdfData {
  company: Company | null
  groups: VencimentoGroupData[]
  totalGeralPagar: number
  totalGeralReceber: number
}

export function generateVencimentosReportPdf(data: VencimentosPdfData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let currentY = drawHeader({
    doc,
    company: data.company,
    title: 'Relatório de Vencimentos Futuros (Pagar & Receber)',
    subtitle: 'Cronograma financeiro agrupado por faixas de prazo de vencimento.',
    period: 'Títulos em aberto',
  })

  // Resumo Geral (3 Caixas: Total a Pagar, Total a Receber, Saldo Projetado)
  const pageWidth = doc.internal.pageSize.getWidth()
  const boxWidth = (pageWidth - 28 - 6) / 3
  const boxHeight = 18

  const cards = [
    {
      label: 'Total a Pagar (Em Aberto)',
      val: formatCurrency(data.totalGeralPagar),
      color: [220, 38, 38],
    },
    {
      label: 'Total a Receber (Em Aberto)',
      val: formatCurrency(data.totalGeralReceber),
      color: [5, 150, 105],
    },
    {
      label: 'Saldo Líquido Projetado',
      val: formatCurrency(data.totalGeralReceber - data.totalGeralPagar),
      color: data.totalGeralReceber >= data.totalGeralPagar ? [5, 150, 105] : [220, 38, 38],
    },
  ]

  cards.forEach((card, idx) => {
    const x = 14 + idx * (boxWidth + 3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(x, currentY, boxWidth, boxHeight, 2, 2, 'S')

    doc.setFillColor(card.color[0], card.color[1], card.color[2])
    doc.rect(x, currentY, boxWidth, 1.5, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(card.label.toUpperCase(), x + 3, currentY + 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(card.color[0], card.color[1], card.color[2])
    doc.text(card.val, x + 3, currentY + 12.5)
  })

  currentY += boxHeight + 8

  // Para cada grupo com itens, gera uma seção com sua tabela
  data.groups.forEach((group) => {
    if (group.items.length === 0) return

    // Checa quebra de página
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`${group.title} (${group.stats.total} títulos)`, 14, currentY)

    // Subtítulo do grupo com sumário rápido
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    const summaryText = `A Pagar: ${formatCurrency(group.stats.pagar)} | A Receber: ${formatCurrency(group.stats.receber)} | Saldo: ${formatCurrency(group.stats.saldo)}`
    doc.text(summaryText, 14, currentY + 4)

    currentY += 6

    const tableRows = group.items.map((item) => [
      item.tipo,
      item.descricao,
      item.contraparte,
      formatDatePtBr(item.vencimento),
      (item.tipo === 'A Pagar' ? '- ' : '+ ') + formatCurrency(item.valor),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      head: [['Tipo', 'Descrição', 'Fornecedor / Cliente', 'Vencimento', 'Valor']],
      body: tableRows,
      foot: [
        [
          '',
          '',
          `Subtotal: Pagar ${formatCurrency(group.stats.pagar)} | Receber ${formatCurrency(group.stats.receber)}`,
          'Saldo',
          formatCurrency(group.stats.saldo),
        ],
      ],
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 42 },
        3: { cellWidth: 24 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          if (hookData.cell.raw === 'A Pagar') {
            hookData.cell.styles.textColor = [220, 38, 38]
          } else {
            hookData.cell.styles.textColor = [5, 150, 105]
          }
        }
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  })

  applyPageNumbers(doc)
  doc.save(`relatorio_vencimentos_${new Date().toISOString().split('T')[0]}.pdf`)
}
