import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Layers,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  ShieldCheck,
  File,
  Download,
  AlertCircle,
  Building2,
  ExternalLink,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import type { ProductionBatch, ProductionBatchItem } from '@/types/erp'
import { getPublicProductionBatchByToken, getPbFileUrl } from '@/services/erp'
import { formatDatePtBr } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const ConsultaLotePublico: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [batch, setBatch] = useState<ProductionBatch | null>(null)
  const [items, setItems] = useState<ProductionBatchItem[]>([])
  const [company, setCompany] = useState<{
    id: string
    trade_name: string
    legal_name: string
    logo?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadPublicData() {
      if (!token) {
        setError('Token de consulta não informado.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const res = await getPublicProductionBatchByToken(token)
        if (isMounted) {
          setBatch(res.batch)
          setItems(res.items)
          setCompany(res.company)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.message ||
              'Lote não encontrado ou a consulta pública não está autorizada para este registro.',
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPublicData()

    return () => {
      isMounted = false
    }
  }, [token])

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '')
  }

  const companyLogoUrl =
    company?.logo && company?.id ? getPbFileUrl('companies', company.id, company.logo) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Consultando Ficha do Lote...</h2>
          <p className="text-xs text-slate-500">
            Verificando chave de segurança pública e carregando dados de rastreabilidade.
          </p>
        </div>
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Consulta Pública Indisponível</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="text-xs">
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Voltar ao Início
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Topo Público com Identificação da Empresa */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3.5 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={company?.trade_name || 'Logo'}
                className="w-10 h-10 object-contain rounded-lg bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                Ficha Pública de Rastreabilidade
              </span>
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {company?.trade_name || company?.legal_name || 'Automação Empresarial'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Autêntico
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal da Ficha Pública */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Banner do Lote */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Lote de Fabricação
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5">
                {batch.batch_number}
              </h2>
            </div>

            <div>
              <Badge
                className={
                  batch.status === 'finalizado'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-xs px-3 py-1 font-semibold'
                    : 'bg-amber-50 text-amber-700 border-amber-300 text-xs px-3 py-1 font-semibold'
                }
              >
                {batch.status === 'finalizado' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Produção
                    Finalizada
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Produção Aberta
                  </>
                )}
              </Badge>
            </div>
          </div>

          {/* Dados Gerais do Lote */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Data de Produção
              </span>
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 mt-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
                {formatDatePtBr(batch.production_date)}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Produto Fabricado
              </span>
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 mt-1">
                <Package className="w-4 h-4 text-emerald-600" />
                {batch.product_name || batch.expand?.product_id?.name || 'Não especificado'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Quantidade Fabricada
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-1 block">
                {batch.quantity_produced ?? 0} unidades
              </span>
            </div>

            {batch.notes && (
              <div className="sm:col-span-3 pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                  Observações Gerais do Lote
                </span>
                <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-100">
                  {batch.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Insumos e Rastreabilidade */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Insumos & Componentes Utilizados ({items.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rastreabilidade de matéria-prima, gramatura, fornecedor e certificados anexos.
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Nenhum insumo associado a este lote.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const attachments = item.attachments || []

                return (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.item_name}</h4>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Qtd Consumida
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {item.quantity_used} {item.unit_measure || 'un'}
                        </span>
                      </div>
                    </div>

                    {/* Especificações Técnicas do Insumo */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Gramatura / Medida
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.grammage_value != null && item.grammage_value > 0
                            ? `${item.grammage_value} ${item.grammage_type || 'g/m²'}`
                            : item.grammage_type || 'Não informado'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Lote do Fornecedor
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          {item.supplier_batch_number || 'Sem lote inf.'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Data de Fabricação
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.manufacture_date
                            ? formatDatePtBr(item.manufacture_date)
                            : 'Não informada'}
                        </span>
                      </div>
                    </div>

                    {/* Observações de Individualização */}
                    {item.notes && (
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                        <strong className="text-slate-900 block mb-1 text-[11px] uppercase tracking-wide">
                          Detalhes de Individualização:
                        </strong>
                        <p className="whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}

                    {/* Anexos e Fotos da Etiqueta */}
                    {attachments.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                          Fotos e Documentos Anexados ({attachments.length}):
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                                className="group relative border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-emerald-400 transition flex flex-col justify-between shadow-2xs"
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
                                    <File className="w-8 h-8 text-slate-400 mb-1" />
                                    <span className="text-[9px] uppercase font-mono">
                                      {fileName.split('.').pop()}
                                    </span>
                                  </div>
                                )}

                                <div className="p-2 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                                  <span
                                    className="text-[10px] text-slate-700 truncate font-mono"
                                    title={fileName}
                                  >
                                    {fileName}
                                  </span>
                                  <a
                                    href={fileUrl}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-400 hover:text-emerald-700 transition shrink-0"
                                    title="Baixar anexo"
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

        {/* Rodapé institucional */}
        <div className="text-center text-xs text-slate-400 pt-4 space-y-1">
          <p>
            Documento emitido via plataforma <strong>Automação Empresarial</strong>.
          </p>
          <p className="text-[11px]">
            Esta página de consulta é somente-leitura e não expõe dados financeiros ou sensíveis da
            empresa.
          </p>
        </div>
      </main>
    </div>
  )
}

export default ConsultaLotePublico
