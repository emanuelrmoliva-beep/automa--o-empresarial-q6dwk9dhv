import React, { useState } from 'react'
import {
  Layers,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  Tag,
  Building2,
  File,
  Download,
  DollarSign,
  Globe,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { ProductionBatch, ProductionBatchItem, Company } from '@/types/erp'
import { formatDatePtBr, formatCurrency } from '@/lib/formatters'
import { getPbFileUrl, updateProductionBatch } from '@/services/erp'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { renderQRCodeToCanvas } from '@/services/qrcode'

export interface BatchDetailModalProps {
  batch: ProductionBatch | null
  isOpen: boolean
  onClose: () => void
  company?: Company | null
  onBatchUpdated?: (updatedBatch: ProductionBatch) => void
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batch: initialBatch,
  isOpen,
  onClose,
  company,
  onBatchUpdated,
}) => {
  const [currentBatch, setCurrentBatch] = useState<ProductionBatch | null>(initialBatch)
  const [updatingPublic, setUpdatingPublic] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const qrCanvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Sincronizar quando a prop batch mudar
  React.useEffect(() => {
    setCurrentBatch(initialBatch)
  }, [initialBatch])

  const batch = currentBatch

  // Renderizar o QR Code quando modal de QR Code abrir
  React.useEffect(() => {
    if (showQrModal && qrCanvasRef.current && batch?.public_token) {
      const publicUrl = `${window.location.origin}/consulta-lote/${batch.public_token}`
      renderQRCodeToCanvas(qrCanvasRef.current, publicUrl, {
        size: 220,
        margin: 2,
      })
    }
  }, [showQrModal, batch?.public_token])

  if (!batch) return null

  const items = batch.items || []

  // Cálculo do Custo do Lote e Custo Unitário
  const totalCost =
    batch.total_cost != null && batch.total_cost > 0
      ? batch.total_cost
      : items.reduce(
          (acc, it) => acc + (it.total_cost || (it.unit_cost || 0) * (it.quantity_used || 0)),
          0,
        )

  const quantityProduced = batch.quantity_produced || 0
  const costPerUnit = quantityProduced > 0 ? totalCost / quantityProduced : null

  // Link público
  const publicUrl = batch.public_token
    ? `${window.location.origin}/consulta-lote/${batch.public_token}`
    : ''

  const handleCopyPublicUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedLink(true)
      toast({
        title: 'Link copiado!',
        description: 'URL pública de consulta do lote copiada para a área de transferência.',
      })
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link automaticamente.',
        variant: 'destructive',
      })
    }
  }

  const handleTogglePublic = async () => {
    try {
      setUpdatingPublic(true)
      const nextIsPublic = !batch.is_public
      let nextToken = batch.public_token

      if (nextIsPublic && !nextToken) {
        // Gerar token único e seguro para consulta pública
        nextToken =
          'lote_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12)
      }

      const updated = await updateProductionBatch(batch.id, {
        is_public: nextIsPublic,
        public_token: nextIsPublic ? nextToken : '',
      })

      const mergedBatch: ProductionBatch = {
        ...batch,
        ...updated,
        items: batch.items,
      }
      setCurrentBatch(mergedBatch)
      if (onBatchUpdated) {
        onBatchUpdated(mergedBatch)
      }

      toast({
        title: nextIsPublic ? 'Consulta Pública Ativada' : 'Consulta Pública Desativada',
        description: nextIsPublic
          ? 'Qualquer pessoa com o link ou QR Code poderá visualizar esta ficha em modo somente-leitura.'
          : 'O acesso público foi revogado. O link anterior não funcionará mais.',
      })
    } catch (err: any) {
      console.error('Erro ao atualizar consulta pública:', err)
      toast({
        title: 'Erro ao alterar consulta pública',
        description: err?.message || 'Falha ao salvar preferências de visibilidade.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingPublic(false)
    }
  }

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '')
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl">
          {/* Header */}
          <DialogHeader className="bg-slate-900 text-white p-5 border-b border-slate-800 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                    Ficha Completa de Rastreabilidade
                  </span>
                  <DialogTitle className="text-base sm:text-lg font-bold text-white font-mono">
                    {batch.batch_number}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    Histórico detalhado de insumos, fornecedores, custos e consulta pública.
                  </DialogDescription>
                </div>
              </div>

              <div>
                <Badge
                  className={
                    batch.status === 'finalizado'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }
                >
                  {batch.status === 'finalizado' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Finalizado
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 mr-1" /> Em Produção
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Body com Scroll */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Bloco 1: Consulta Pública e QR Code (Evolução 1) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      batch.is_public
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Acesso Externo / Transparência
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Consulta Pública do Lote
                      <Badge
                        variant="outline"
                        className={
                          batch.is_public
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]'
                            : 'bg-slate-100 text-slate-600 border-slate-300 text-[10px]'
                        }
                      >
                        {batch.is_public ? 'Ativada (Pública)' : 'Desativada (Privada)'}
                      </Badge>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={batch.is_public ? 'destructive' : 'default'}
                    size="sm"
                    disabled={updatingPublic}
                    onClick={handleTogglePublic}
                    className={`text-xs font-semibold ${
                      !batch.is_public
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-700 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {updatingPublic ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : batch.is_public ? (
                      <ToggleRight className="w-4 h-4 mr-1.5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 mr-1.5 text-slate-300" />
                    )}
                    {batch.is_public ? 'Desativar Consulta' : 'Ativar Consulta Pública'}
                  </Button>
                </div>
              </div>

              {batch.is_public && batch.public_token ? (
                <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" /> URL Pública com Token
                      Seguro
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Somente-leitura • Sem dados financeiros sensíveis
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono truncate select-all">
                      {publicUrl}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPublicUrl}
                        className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowQrModal(true)}
                        className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <QrCode className="w-3.5 h-3.5 mr-1" /> QR Code
                      </Button>

                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 px-2.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
                      </a>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Dica: Ao imprimir a etiqueta de código de barras deste produto no Estoque, o
                    QR Code deste link será incluído automaticamente na etiqueta.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Ao ativar a consulta pública, uma página somente-leitura com token inviolável é
                  gerada para seus clientes escanearem pelo QR Code na etiqueta ou abrirem via link.
                </p>
              )}
            </div>

            {/* Bloco 2: Resumo do Lote e Custos (Evolução 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Data de Fabricação
                </span>
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDatePtBr(batch.production_date)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Produto Fabricado
                </span>
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  {batch.product_name || batch.expand?.product_id?.name || 'Não especificado'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Quantidade Produzida
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                  {batch.quantity_produced ?? 0} unidades
                </span>
              </div>

              <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" /> Custo Total do Lote
                </span>
                <span className="font-mono font-bold text-emerald-700 text-base mt-0.5 block">
                  {formatCurrency(totalCost)}
                </span>
                {costPerUnit != null && (
                  <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">
                    {formatCurrency(costPerUnit)} / un
                  </span>
                )}
              </div>

              {batch.notes && (
                <div className="col-span-full pt-2 border-t border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Observações Gerais da Produção
                  </span>
                  <p className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-100">
                    {batch.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Bloco 3: Insumos Utilizados no Lote */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  Insumos Utilizados no Lote ({items.length})
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Custo acumulado:{' '}
                  <strong className="text-emerald-700">{formatCurrency(totalCost)}</strong>
                </span>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum insumo cadastrado para este lote.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const attachments = item.attachments || []
                    const itemTotal =
                      item.total_cost != null && item.total_cost > 0
                        ? item.total_cost
                        : (item.unit_cost || 0) * (item.quantity_used || 0)

                    return (
                      <div
                        key={item.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm">{item.item_name}</h4>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Qtd Consumida
                              </span>
                              <span className="font-mono font-bold text-slate-700 text-xs">
                                {item.quantity_used} {item.unit_measure || 'un'}
                              </span>
                            </div>
                            {itemTotal > 0 && (
                              <div className="bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                <span className="text-[9px] uppercase font-bold text-emerald-800 block">
                                  Custo Insumo
                                </span>
                                <span className="font-mono font-bold text-emerald-700 text-xs">
                                  {formatCurrency(itemTotal)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ficha técnica do insumo */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">
                              Gramatura / Medida
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.grammage_value != null && item.grammage_value > 0
                                ? `${item.grammage_value} ${item.grammage_type || 'g/m²'}`
                                : item.grammage_type || 'Não informado'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">
                              Lote do Fornecedor
                            </span>
                            <span className="font-mono font-semibold text-slate-700">
                              {item.supplier_batch_number || 'Sem lote inf.'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">
                              Fabricação Insumo
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.manufacture_date
                                ? formatDatePtBr(item.manufacture_date)
                                : 'Não informada'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">
                              Custo Unitário
                            </span>
                            <span className="font-mono font-semibold text-slate-700">
                              {item.unit_cost != null && item.unit_cost > 0
                                ? formatCurrency(item.unit_cost)
                                : 'R$ 0,00'}
                            </span>
                          </div>
                        </div>

                        {/* Observações do Insumo */}
                        {item.notes && (
                          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                            <strong className="text-slate-700 block mb-0.5">
                              Detalhes de Individualização / Observações:
                            </strong>
                            {item.notes}
                          </div>
                        )}

                        {/* Anexos */}
                        {attachments.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              Anexos ({attachments.length}):
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {attachments.map((fileName, aIdx) => {
                                const fileUrl = getPbFileUrl(
                                  'production_batch_items',
                                  item.id,
                                  fileName,
                                )
                                const isImg = isImageFile(fileName)

                                return (
                                  <div
                                    key={aIdx}
                                    className="group relative border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-emerald-300 transition flex flex-col justify-between"
                                  >
                                    {isImg ? (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block aspect-square w-full bg-slate-100 overflow-hidden"
                                        title="Clique para ampliar"
                                      >
                                        <img
                                          src={fileUrl}
                                          alt={fileName}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                      </a>
                                    ) : (
                                      <div className="aspect-square w-full bg-slate-100 flex flex-col items-center justify-center p-2 text-slate-400">
                                        <File className="w-6 h-6 text-slate-400 mb-1" />
                                        <span className="text-[9px] uppercase font-mono">
                                          {fileName.split('.').pop()}
                                        </span>
                                      </div>
                                    )}

                                    <div className="p-1.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                                      <span
                                        className="text-[10px] text-slate-600 truncate font-mono"
                                        title={fileName}
                                      >
                                        {fileName}
                                      </span>
                                      <a
                                        href={fileUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-slate-400 hover:text-emerald-600 transition shrink-0"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 font-mono">ID Lote: {batch.id}</span>
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Fechar Ficha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exibição Ampliada do QR Code */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-xs p-6 bg-white rounded-2xl flex flex-col items-center text-center space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-800">
              QR Code do Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              {batch.batch_number}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-white border-2 border-emerald-500/20 rounded-2xl shadow-sm">
            <canvas ref={qrCanvasRef} className="w-[200px] h-[200px]" />
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Aponte a câmera do celular para abrir diretamente a ficha pública de rastreabilidade do
            lote.
          </p>

          <div className="w-full flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPublicUrl}
              className="flex-1 text-xs"
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowQrModal(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BatchDetailModal
