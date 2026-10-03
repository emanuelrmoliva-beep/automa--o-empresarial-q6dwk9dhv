import jsPDF from 'jspdf'
import type { Product, Company } from '@/types/erp'
import { formatCurrency } from '@/lib/formatters'
import { generateBarcodeDataUrl, getProductBarcodeValue } from './barcode'

export interface LabelItem {
  product: Product
  copies: number
}

export interface LabelGridConfig {
  columns: number
  rows: number
  pageWidth: number // mm
  pageHeight: number // mm
  marginTop: number // mm
  marginLeft: number // mm
  marginRight: number // mm
  marginBottom: number // mm
  labelWidth: number // mm
  labelHeight: number // mm
  colGap: number // mm
  rowGap: number // mm
  drawBorders: boolean
}

// Configuração padrão: Folha A4, 4 colunas x 10 linhas = 40 etiquetas por folha (padrão Pimaco 6350 / A425 / 40 por folha)
// A4 = 210 x 297 mm
// Margem esq/dir = 5mm, Margem sup/inf = 11mm
// 4 colunas de 48mm (4 * 48 = 192mm) + gaps entre colunas (3 * 2.66mm = 8mm) -> 192 + 8 + 10 = 210mm
// 10 linhas de 26mm (10 * 26 = 260mm) + gaps entre linhas (9 * 1.66mm = 15mm) -> 260 + 15 + 22 = 297mm
export const DEFAULT_LABEL_CONFIG: LabelGridConfig = {
  columns: 4,
  rows: 10,
  pageWidth: 210,
  pageHeight: 297,
  marginTop: 10,
  marginLeft: 5,
  marginRight: 5,
  marginBottom: 10,
  labelWidth: 48,
  labelHeight: 25.5,
  colGap: 2.5,
  rowGap: 2,
  drawBorders: true,
}

/**
 * Carrega uma URL de imagem (ex.: logotipo da empresa) em base64 com timeout suave.
 * Se falhar (CORS, offline, etc.), retorna null sem quebrar o PDF.
 */
async function loadLogoBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      const timer = setTimeout(() => {
        resolve(null)
      }, 3500)

      img.onload = () => {
        clearTimeout(timer)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl)
        } catch {
          resolve(null)
        }
      }

      img.onerror = () => {
        clearTimeout(timer)
        resolve(null)
      }

      img.src = url
    } catch {
      resolve(null)
    }
  })
}

/**
 * Gera um PDF A4 com grade de etiquetas de preço com código de barras Code 128.
 * @param items Lista de produtos e número de etiquetas desejadas por cada produto
 * @param company Dados da empresa (nome, cnpj e logo)
 * @param config Configurações de layout da grade A4
 * @returns Instância do jsPDF gerado (permite .save() ou .output())
 */
export async function generatePriceLabelsPdf(
  items: LabelItem[],
  company: Company | null,
  config: Partial<LabelGridConfig> = {},
): Promise<jsPDF> {
  const mergedConfig: LabelGridConfig = { ...DEFAULT_LABEL_CONFIG, ...config }
  const {
    columns,
    rows,
    pageWidth,
    pageHeight,
    marginTop,
    marginLeft,
    labelWidth,
    labelHeight,
    colGap,
    rowGap,
    drawBorders,
  } = mergedConfig

  const labelsPerPage = columns * rows

  // Flatten items em um array de produtos repetidos pelas cópias
  const labelQueue: Product[] = []
  for (const it of items) {
    const qty = Math.max(0, it.copies || 0)
    for (let c = 0; c < qty; c++) {
      labelQueue.push(it.product)
    }
  }

  if (labelQueue.length === 0) {
    throw new Error('Nenhuma etiqueta para imprimir.')
  }

  // Pré-carregar logo se disponível
  let logoDataUrl: string | null = null
  if (company?.logo && typeof window !== 'undefined') {
    try {
      const logoUrl = company.logo.startsWith('http')
        ? company.logo
        : `${window.location.origin}/api/files/companies/${company.id}/${company.logo}`
      logoDataUrl = await loadLogoBase64(logoUrl)
    } catch {
      logoDataUrl = null
    }
  }

  // Cache dos barcodes gerados para não recalcular o mesmo produto dezenas de vezes
  const barcodeCache = new Map<string, string>()

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const companyName = company?.trade_name || company?.legal_name || 'Automação Empresarial'

  let currentItemIndex = 0
  const totalItems = labelQueue.length

  while (currentItemIndex < totalItems) {
    if (currentItemIndex > 0) {
      doc.addPage('a4', 'portrait')
    }

    // Desenhar as etiquetas da página atual
    for (
      let slot = 0;
      slot < labelsPerPage && currentItemIndex < totalItems;
      slot++, currentItemIndex++
    ) {
      const colIndex = slot % columns
      const rowIndex = Math.floor(slot / columns)

      const x = marginLeft + colIndex * (labelWidth + colGap)
      const y = marginTop + rowIndex * (labelHeight + rowGap)

      const product = labelQueue[currentItemIndex]
      const barcodeValue = getProductBarcodeValue(product)

      // Se drawBorders estiver ativo, desenhar linha sutil tracejada para guiar o corte/destaque
      if (drawBorders) {
        doc.setDrawColor(210, 215, 225)
        doc.setLineWidth(0.15)
        // Linha pontilhada suave de corte
        doc.setLineDashPattern([0.8, 0.8], 0)
        doc.rect(x, y, labelWidth, labelHeight, 'S')
        doc.setLineDashPattern([], 0) // reset dash
      }

      // 1. Cabeçalho da etiqueta: Logo da empresa ou Nome Fantasia reduzido
      const headerY = y + 2.5
      let headerTextStartX = x + 2
      const maxHeaderWidth = labelWidth - 4

      if (logoDataUrl) {
        try {
          const logoMaxW = 6.5
          const logoMaxH = 3.5
          doc.addImage(logoDataUrl, 'PNG', x + 2, y + 1.2, logoMaxW, logoMaxH, undefined, 'FAST')
          headerTextStartX = x + 9.5
        } catch {
          headerTextStartX = x + 2
        }
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(71, 85, 105) // slate-600
      const truncatedCompany =
        companyName.length > 22 ? companyName.slice(0, 20) + '…' : companyName
      doc.text(truncatedCompany.toUpperCase(), headerTextStartX, headerY + 1.2, {
        maxWidth: maxHeaderWidth - (headerTextStartX - x),
      })

      // Linha sutil separadora abaixo do cabeçalho
      doc.setDrawColor(235, 240, 245)
      doc.setLineWidth(0.1)
      doc.line(x + 2, y + 5.2, x + labelWidth - 2, y + 5.2)

      // 2. Nome do Produto (até 2 linhas compactas)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      doc.setTextColor(15, 23, 42) // slate-900

      const prodNameY = y + 7.6
      const splitName = doc.splitTextToSize(product.name, labelWidth - 4)
      const visibleLines = splitName.slice(0, 2)
      doc.text(visibleLines, x + 2, prodNameY)

      // 3. Preço de Venda em Real (R$) grande e destacado
      const priceY = y + (visibleLines.length > 1 ? 13.6 : 12.8)

      // Label "PREÇO" ou "R$"
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(100, 116, 139)
      doc.text('PREÇO', x + 2, priceY)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(5, 150, 105) // emerald-600
      const formattedPrice = formatCurrency(product.selling_price || 0)
      doc.text(formattedPrice, x + labelWidth - 2, priceY, { align: 'right' })

      // 4. Código de barras Code 128 (canvas render -> DataUrl)
      let barcodeImg = barcodeCache.get(barcodeValue)
      if (!barcodeImg) {
        barcodeImg = generateBarcodeDataUrl(barcodeValue, {
          width: 320,
          height: 65,
          displayValue: false, // O valor em texto colocamos manualmente no PDF com tipografia nítida
        })
        barcodeCache.set(barcodeValue, barcodeImg)
      }

      const barcodeW = labelWidth - 4
      const barcodeH = 5.8
      const barcodeY = y + labelHeight - 8.8

      if (barcodeImg) {
        try {
          doc.addImage(barcodeImg, 'PNG', x + 2, barcodeY, barcodeW, barcodeH, undefined, 'FAST')
        } catch (err) {
          console.warn('Erro ao desenhar código de barras no PDF:', err)
        }
      }

      // 5. SKU / Código legível abaixo do código de barras
      doc.setFont('courier', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(51, 65, 85) // slate-700
      const codeTextY = y + labelHeight - 1.2
      doc.text(barcodeValue, x + labelWidth / 2, codeTextY, { align: 'center' })
    }
  }

  return doc
}

/**
 * Dispara o download automático do PDF gerado de etiquetas.
 */
export async function downloadPriceLabelsPdf(
  items: LabelItem[],
  company: Company | null,
  config?: Partial<LabelGridConfig>,
): Promise<void> {
  const doc = await generatePriceLabelsPdf(items, company, config)
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `etiquetas_estoque_${dateStr}.pdf`
  doc.save(filename)
}
