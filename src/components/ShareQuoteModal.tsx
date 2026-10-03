import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Share2,
  Download,
  Copy,
  Mail,
  MessageCircle,
  Check,
  Building2,
  Calendar,
  User,
  Info,
} from 'lucide-react'
import type { Quote, Company } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { generateQuotePdf } from '@/services/quotePdf'
import { useToast } from '@/hooks/use-toast'

interface ShareQuoteModalProps {
  quote: Quote | null
  company: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareQuoteModal({ quote, company, open, onOpenChange }: ShareQuoteModalProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (!quote) return null

  const companyName = company?.trade_name || company?.legal_name || 'Nossa Empresa'
  const clientName = quote.expand?.customer_id?.name || quote.customer_name || 'Cliente'
  const items = Array.isArray(quote.items) ? quote.items : []

  // Texto formatado para WhatsApp / E-mail / Clipboard
  const itemsSummary = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.quantity}x ${formatCurrency(item.unit_price)}) = ${formatCurrency(item.total)}`,
    )
    .join('\n')

  const validUntilText = quote.valid_until
    ? `\n*Validade da Proposta:* até ${formatDatePtBr(quote.valid_until)}`
    : ''

  const termsText = quote.payment_terms ? `\n*Condições de Pagamento:* ${quote.payment_terms}` : ''

  const quoteMessage = `*Olá, ${clientName}!*

Aqui está a proposta comercial elaborada por *${companyName}*:

📋 *Orçamento:* ${quote.quote_number || quote.title}
📅 *Data de Emissão:* ${formatDatePtBr(quote.issue_date)}${validUntilText}

*Itens / Serviços:*
${itemsSummary || `• ${quote.title}: ${formatCurrency(quote.total_amount)}`}

💰 *VALOR TOTAL:* ${formatCurrency(quote.total_amount)}${termsText}

${quote.notes ? `\n*Observações:* ${quote.notes}\n` : ''}
Ficamos à disposição para tirar dúvidas e fechar negócio!
Atenciosamente,
*${companyName}*`

  // WhatsApp
  const handleWhatsApp = () => {
    let phone = quote.expand?.customer_id?.phone || quote.customer_contact || ''
    // remove caracteres não numéricos
    phone = phone.replace(/\D/g, '')
    if (phone && !phone.startsWith('55') && phone.length >= 10 && phone.length <= 11) {
      phone = `55${phone}`
    }
    const encoded = encodeURIComponent(quoteMessage)
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  // E-mail
  const handleEmail = () => {
    const email = quote.expand?.customer_id?.email || ''
    const subject = encodeURIComponent(
      `Orçamento ${quote.quote_number || quote.title} - ${companyName}`,
    )
    const body = encodeURIComponent(quoteMessage)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  // Copiar para a área de transferência
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quoteMessage)
      setCopied(true)
      toast({
        title: 'Copiado!',
        description: 'Texto do orçamento copiado para a área de transferência.',
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Selecione e copie o texto manualmente.',
      })
    }
  }

  // Web Share API nativa
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Orçamento ${quote.quote_number || quote.title} - ${companyName}`,
          text: quoteMessage,
        })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast({
            variant: 'destructive',
            title: 'Não foi possível compartilhar',
            description: 'Tente copiar ou enviar via WhatsApp.',
          })
        }
      }
    } else {
      handleCopy()
    }
  }

  const handleDownloadPdf = () => {
    generateQuotePdf(quote, company)
    toast({
      title: 'PDF Gerado!',
      description: 'O arquivo PDF do orçamento foi baixado com sucesso.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg">
            <Share2 className="w-5 h-5 text-emerald-600" />
            Compartilhar Orçamento
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Envie a proposta diretamente pelo seu aplicativo favorito (WhatsApp, e-mail ou PDF). O
            sistema não realiza disparos automáticos ou cobranças por conectores.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do Orçamento */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span className="flex items-center gap-1.5 text-sm">
              <Building2 className="w-4 h-4 text-emerald-600" /> {quote.title}
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-sm font-bold">
              {formatCurrency(quote.total_amount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Cliente: {clientName}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Emissão: {formatDatePtBr(quote.issue_date)}</span>
            </div>
          </div>
        </div>

        {/* Canais de Compartilhamento Direto */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-semibold text-slate-700 block">
            Escolha um canal de envio:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <Button
              type="button"
              onClick={handleWhatsApp}
              className="w-full justify-start h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/30 flex items-center justify-center mr-2 shrink-0">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="text-left leading-tight truncate">
                <span className="font-semibold block">WhatsApp</span>
                <span className="text-[10px] text-emerald-100">Abrir wa.me com texto</span>
              </div>
            </Button>

            {/* Baixar PDF */}
            <Button
              type="button"
              onClick={handleDownloadPdf}
              variant="outline"
              className="w-full justify-start h-12 border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-xs px-3 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-2 shrink-0">
                <Download className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-left leading-tight truncate">
                <span className="font-semibold block">Gerar PDF</span>
                <span className="text-[10px] text-slate-500">Baixar arquivo da proposta</span>
              </div>
            </Button>

            {/* E-mail (mailto) */}
            <Button
              type="button"
              onClick={handleEmail}
              variant="outline"
              className="w-full justify-start h-12 border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-xs px-3 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-2 shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left leading-tight truncate">
                <span className="font-semibold block">E-mail</span>
                <span className="text-[10px] text-slate-500">Abrir no seu leitor padrão</span>
              </div>
            </Button>

            {/* Copiar Texto */}
            <Button
              type="button"
              onClick={handleCopy}
              variant="outline"
              className="w-full justify-start h-12 border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-xs px-3 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-2 shrink-0">
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="text-left leading-tight truncate">
                <span className="font-semibold block">{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                <span className="text-[10px] text-slate-500">Área de transferência</span>
              </div>
            </Button>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              type="button"
              onClick={handleNativeShare}
              variant="secondary"
              className="w-full h-10 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
            >
              <Share2 className="w-4 h-4 mr-2 text-slate-600" />
              Compartilhar pelo celular (Menu nativo)
            </Button>
          )}
        </div>

        {/* Pré-visualização do texto */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium text-slate-700">Prévia da mensagem pronta:</span>
            <span className="text-[11px] text-slate-400">Totalmente editável antes do envio</span>
          </div>
          <pre className="p-3 bg-slate-900 text-emerald-300 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto border border-slate-800 select-all">
            {quoteMessage}
          </pre>
        </div>

        {/* Nota explicativa de segurança e custos */}
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-2.5 flex items-start gap-2 text-slate-700 text-[11px]">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            O envio é processado com total privacidade através do seu WhatsApp, leitor de e-mail ou
            navegador. Nenhuma taxa adicional é cobrada por esta funcionalidade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
