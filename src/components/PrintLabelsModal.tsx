import React, { useState, useEffect, useRef } from 'react'
import {
  Barcode,
  Printer,
  FileDown,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Sparkles,
  Info,
} from 'lucide-react'
import type { Product, Company, ProductionBatch } from '@/types/erp'
import { getProductionBatches } from '@/services/erp'
import { formatCurrency } from '@/lib/formatters'
import { renderBarcodeToCanvas, getProductBarcodeValue } from '@/services/barcode'
import { downloadPriceLabelsPdf, type LabelItem } from '@/services/labelPdf'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export interface PrintLabelsModalProps {
  isOpen: boolean
  onClose: () => void
  company: Company | null
  initialProducts: Product[]
  allAvailableProducts?: Product[]
}

export const PrintLabelsModal: React.FC<PrintLabelsModalProps> = ({
  isOpen,
  onClose,
  company,
  initialProducts,
  allAvailableProducts = [],
}) => {
  const { toast } = useToast()
  const [selectedItems, setSelectedItems] = useState<{ [productId: string]: number }>({})
  const [selectedBatches, setSelectedBatches] = useState<{ [productId: string]: string }>({})
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [drawBorders, setDrawBorders] = useState(true)
  const [defaultCopies, setDefaultCopies] = useState('1')
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Carregar lotes de produção da empresa para permitir vincular número de lote na etiqueta
  useEffect(() => {
    if (isOpen && company) {
      getProductionBatches(company.id)
        .then((batches) => setProductionBatches(batches))
        .catch(() => setProductionBatches([]))
    }
  }, [isOpen, company])

  // Quando o modal abre ou initialProducts muda, inicializa as quantidades
  useEffect(() => {
    if (isOpen) {
      const initialMap: { [id: string]: number } = {}
      initialProducts.forEach((p) => {
        initialMap[p.id] = 1
      })
      setSelectedItems(initialMap)
    }
  }, [isOpen, initialProducts])

  // Lista dos produtos atualmente selecionados com quantidade > 0
  const activeProducts = (
    allAvailableProducts.length > 0 ? allAvailableProducts : initialProducts
  ).filter((p) => (selectedItems[p.id] || 0) > 0)

  const totalLabels = Object.values(selectedItems).reduce((sum, qty) => sum + (qty || 0), 0)
  const totalPages = Math.ceil(totalLabels / 40) || 1

  // Primeiro produto para exibição no Preview
  const firstProduct = activeProducts[0] || initialProducts[0]

  // Renderizar o canvas de pré-visualização da etiqueta de exemplo
  useEffect(() => {
    if (!previewCanvasRef.current || !firstProduct) return
    const code = getProductBarcodeValue(firstProduct)
    renderBarcodeToCanvas(previewCanvasRef.current, code, {
      width: 260,
      height: 60,
      displayValue: true,
      fontSize: 12,
    })
  }, [firstProduct])

  const handleSetAllCopies = (copies: number) => {
    const val = Math.max(1, copies)
    setSelectedItems((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((id) => {
        updated[id] = val
      })
      return updated
    })
  }

  const handleUpdateQty = (productId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[productId] || 0
      const next = Math.max(0, current + delta)
      const copy = { ...prev }
      if (next === 0) {
        delete copy[productId]
      } else {
        copy[productId] = next
      }
      return copy
    })
  }

  const handleSetQty = (productId: string, val: string) => {
    const parsed = parseInt(val, 10)
    setSelectedItems((prev) => {
      const copy = { ...prev }
      if (isNaN(parsed) || parsed <= 0) {
        delete copy[productId]
      } else {
        copy[productId] = Math.min(1000, parsed)
      }
      return copy
    })
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedItems((prev) => {
      const copy = { ...prev }
      delete copy[productId]
      return copy
    })
  }

  const handleAddAllFiltered = () => {
    const copies = parseInt(defaultCopies, 10) || 1
    const newMap: { [id: string]: number } = {}
    allAvailableProducts.forEach((p) => {
      newMap[p.id] = copies
    })
    setSelectedItems(newMap)
  }

  const handleClearAll = () => {
    setSelectedItems({})
  }

  const handleGeneratePdf = async () => {
    if (totalLabels === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma etiqueta selecionada',
        description: 'Selecione pelo menos 1 etiqueta para gerar o PDF.',
      })
      return
    }

    try {
      setIsGenerating(true)
      const itemsToPrint: LabelItem[] = []

      const productsPool = allAvailableProducts.length > 0 ? allAvailableProducts : initialProducts
      productsPool.forEach((p) => {
        const qty = selectedItems[p.id]
        const batchNum = selectedBatches[p.id] || undefined
        if (qty && qty > 0) {
          itemsToPrint.push({
            product: p,
            copies: qty,
            batchNumber: batchNum,
          })
        }
      })

      await downloadPriceLabelsPdf(itemsToPrint, company, {
        drawBorders,
      })

      toast({
        title: 'PDF de Etiquetas gerado com sucesso!',
        description: `${totalLabels} etiquetas distribuídas em ${totalPages} folha(s) A4.`,
      })
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF de etiquetas',
        description: err?.message || 'Ocorreu uma falha durante a geração do documento.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:max-w-[760px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Imprimir Etiquetas com Código de Barras</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Code 128
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Folha A4 adesiva padrão 4 colunas × 10 linhas (40 etiquetas por folha).
              </p>
            </div>
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Card de Pré-visualização da Etiqueta */}
          {firstProduct && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Modelo da Etiqueta (Exemplo
                  Real)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  48 × 25.5 mm • Padrão Pimaco 6350 / A425
                </span>
              </div>

              {/* Simulação gráfica da etiqueta */}
              <div className="max-w-[280px] mx-auto bg-white rounded-lg border-2 border-dashed border-slate-300 p-2.5 shadow-xs space-y-1.5 text-center">
                {/* Cabeçalho da etiqueta */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-[10px] text-slate-500 font-semibold truncate">
                  <span className="truncate">
                    {company?.trade_name || company?.legal_name || 'Automação Empresarial'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 shrink-0">
                    {company?.cnpj ? `CNPJ ${company.cnpj.slice(0, 8)}...` : 'ERP'}
                  </span>
                </div>

                {/* Nome do produto */}
                <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                  {firstProduct.name}
                </div>

                {/* Preço de venda destacado e Lote */}
                <div className="flex items-baseline justify-between px-1 bg-emerald-50/70 rounded py-0.5 border border-emerald-100">
                  <div className="text-left">
                    {selectedBatches[firstProduct.id] ? (
                      <span className="text-[9px] font-bold text-teal-700 block">
                        LOTE: {selectedBatches[firstProduct.id]}
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-slate-500 uppercase">
                        Preço
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono">
                    {formatCurrency(firstProduct.selling_price || 0)}
                  </span>
                </div>

                {/* Canvas do Código de barras Code 128 */}
                <div className="pt-0.5">
                  <canvas ref={previewCanvasRef} className="w-full h-11 mx-auto bg-white" />
                </div>
              </div>
            </div>
          )}

          {/* Barra de Ações Rápidas em Lote */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Cópias padrão:</span>
              <Input
                type="number"
                min="1"
                max="100"
                value={defaultCopies}
                onChange={(e) => setDefaultCopies(e.target.value)}
                className="w-16 h-8 text-xs font-mono text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAllCopies(parseInt(defaultCopies, 10) || 1)}
                className="h-8 text-xs"
              >
                Aplicar a Todos
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {allAvailableProducts.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllFiltered}
                  className="h-8 text-xs text-slate-700 hover:text-emerald-700"
                  title="Selecionar todos os produtos filtrados da listagem"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  Selecionar Todos ({allAvailableProducts.length})
                </Button>
              )}
              {totalLabels > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar Seleção
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Produtos Selecionados com seletor de quantidade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Produtos na Folha ({activeProducts.length})
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={drawBorders}
                  onChange={(e) => setDrawBorders(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Bordas pontilhadas de corte (guia adesivo)</span>
              </label>
            </div>

            {activeProducts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Square className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Nenhum produto selecionado</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecione produtos na lista ou clique em &quot;Selecionar Todos&quot; acima.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-white shadow-2xs">
                {activeProducts.map((p) => {
                  const qty = selectedItems[p.id] || 0
                  const barcodeValue = getProductBarcodeValue(p)

                  // Lotes associados a este produto (ou sem produto específico mas da mesma empresa)
                  const matchingBatches = productionBatches.filter(
                    (b) => !b.product_id || b.product_id === p.id,
                  )
                  const currentBatch = selectedBatches[p.id] || ''

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-slate-900 truncate">
                            {p.name}
                          </h4>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded shrink-0">
                            {barcodeValue}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="text-emerald-700 font-bold font-mono">
                            {formatCurrency(p.selling_price || 0)}
                          </span>
                          <span>•</span>
                          <span>Estoque atual: {p.quantity} un.</span>
                        </div>

                        {/* Seletor de Lote para a etiqueta */}
                        {matchingBatches.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-500">
                              Lote na etiqueta:
                            </span>
                            <select
                              value={currentBatch}
                              onChange={(e) => {
                                const val = e.target.value
                                setSelectedBatches((prev) => ({
                                  ...prev,
                                  [p.id]: val,
                                }))
                              }}
                              className="text-[11px] h-6 px-2 border border-slate-200 rounded bg-white text-slate-800 font-mono focus:outline-emerald-600"
                            >
                              <option value="">Sem lote (Padrão)</option>
                              {matchingBatches.map((b) => (
                                <option key={b.id} value={b.batch_number}>
                                  {b.batch_number} {b.product_name ? `(${b.product_name})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Controle de cópias */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.id, -1)}
                          className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition"
                          title="Diminuir cópia"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          value={qty}
                          onChange={(e) => handleSetQty(p.id, e.target.value)}
                          className="w-14 h-7 text-xs font-mono font-bold text-center px-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.id, 1)}
                          className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition"
                          title="Aumentar cópia"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(p.id)}
                          className="w-7 h-7 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition ml-1"
                          title="Remover produto da folha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dica informativa */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Dica de Impressão na Impressora:</span>
              <span className="text-[11px] text-emerald-800 leading-relaxed block">
                Na janela de impressão do seu navegador ou leitor de PDF, configure o{' '}
                <strong>Tamanho como &quot;A4&quot;</strong> e a{' '}
                <strong>Escala como &quot;Tamanho Real&quot; (100%)</strong> para que as etiquetas
                se alinhem perfeitamente com os adesivos destacados da folha.
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé fixo */}
        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="font-semibold text-slate-900 font-mono text-sm">{totalLabels}</span>{' '}
            etiqueta(s) selecionada(s) •{' '}
            <strong className="text-slate-800">{totalPages} folha(s) A4</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 sm:flex-initial text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={isGenerating || totalLabels === 0}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Gerando PDF...
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir Folha A4 (PDF)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
