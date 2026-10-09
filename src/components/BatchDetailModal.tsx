import React from 'react'
import {
  Calendar,
  Layers,
  FileText,
  Download,
  Image as ImageIcon,
  File,
  X,
  Package,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import type { ProductionBatch, ProductionBatchItem, Company } from '@/types/erp'
import { formatDatePtBr } from '@/lib/formatters'
import { getPbFileUrl } from '@/services/erp'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface BatchDetailModalProps {
  batch: (ProductionBatch & { items?: ProductionBatchItem[] }) | null
  isOpen: boolean
  onClose: () => void
  company?: Company | null
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({ batch, isOpen, onClose }) => {
  if (!batch) return null

  const items = batch.items || []

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-white font-mono">
                  {batch.batch_number}
                </DialogTitle>
                <Badge
                  className={
                    batch.status === 'finalizado'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }
                >
                  {batch.status === 'finalizado' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Finalizado
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 mr-1" /> Aberto
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ficha Técnica de Rastreabilidade & Produção
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-slate-700">
          {/* Informações Gerais do Lote */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Data de Produção
              </span>
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                {formatDatePtBr(batch.production_date)}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Produto Fabricado
              </span>
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                {batch.product_name || batch.expand?.product_id?.name || 'Não especificado'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Quantidade Fabricada
              </span>
              <span className="font-bold text-slate-900 font-mono text-sm mt-0.5 block">
                {batch.quantity_produced ?? 0} unidades
              </span>
            </div>

            {batch.notes && (
              <div className="sm:col-span-3 pt-2 border-t border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                  Observações Gerais da Produção
                </span>
                <p className="text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100">
                  {batch.notes}
                </p>
              </div>
            )}
          </div>

          {/* Insumos e Rastreabilidade */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Insumos Utilizados no Lote ({items.length})
              </h4>
              <span className="text-[11px] text-slate-500">Individualização completa e anexos</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="font-semibold text-slate-600">Nenhum insumo cadastrado neste lote</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const attachments = item.attachments || []

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center justify-center border border-emerald-200">
                              {idx + 1}
                            </span>
                            <h5 className="font-bold text-slate-900 text-sm">{item.item_name}</h5>
                            {item.expand?.product_id && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                SKU: {item.expand.product_id.sku || '-'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right sm:text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Qtd Utilizada
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {item.quantity_used} {item.unit_measure || 'un'}
                          </span>
                        </div>
                      </div>

                      {/* Métricas e Detalhes de Individualização do Insumo */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                            Gramatura / Medida
                          </span>
                          <span className="font-medium text-slate-800">
                            {item.grammage_value != null && item.grammage_value > 0
                              ? `${item.grammage_value} ${item.grammage_type || 'g/m²'}`
                              : item.grammage_type || 'Não informado'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                            Lote do Insumo
                          </span>
                          <span className="font-mono font-semibold text-slate-800">
                            {item.supplier_batch_number || 'Sem lote inf.'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                            Data de Fabricação
                          </span>
                          <span className="font-medium text-slate-800">
                            {item.manufacture_date
                              ? formatDatePtBr(item.manufacture_date)
                              : 'Não informada'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                            Baixa no Estoque
                          </span>
                          <span className="font-medium text-emerald-700">
                            {item.product_id ? 'Vinculado ao Estoque' : 'Insumo Externo'}
                          </span>
                        </div>
                      </div>

                      {/* Observações do Insumo */}
                      {item.notes && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          <strong className="text-slate-800 block mb-0.5">
                            Detalhes de Individualização / Observações:
                          </strong>
                          <p className="whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}

                      {/* Upload de Arquivos / Fotos / Anexos do Insumo */}
                      {attachments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                            Fotos e Documentos Anexados ({attachments.length}):
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
                                  className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 hover:border-emerald-300 transition flex flex-col justify-between"
                                >
                                  {isImg ? (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block aspect-square w-full bg-slate-100 overflow-hidden"
                                    >
                                      <img
                                        src={fileUrl}
                                        alt={fileName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </a>
                                  ) : (
                                    <div className="aspect-square w-full bg-slate-100 flex flex-col items-center justify-center p-2 text-slate-400">
                                      <File className="w-8 h-8 text-slate-400 mb-1" />
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
                                      className="p-1 text-slate-400 hover:text-emerald-700 transition"
                                      title="Download do anexo"
                                    >
                                      <Download className="w-3 h-3" />
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
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:px-6 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">ID Lote: {batch.id}</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Ficha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default BatchDetailModal
