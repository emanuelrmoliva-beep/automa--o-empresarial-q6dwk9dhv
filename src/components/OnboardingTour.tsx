import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  Package,
  ReceiptText,
  Target,
  CalendarDays,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface TourStep {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  route?: string
  highlights: string[]
  badge: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Automação Empresarial! 🚀',
    subtitle: 'Conheça o seu ERP de Gestão Completa',
    description:
      'Preparamos este tour rápido para apresentar as principais áreas do sistema e como elas vão acelerar as decisões do seu negócio dia a dia.',
    icon: Sparkles,
    route: '/dashboard',
    badge: 'Início do Tour',
    highlights: [
      'Visual moderno, responsivo e adaptado para celular, tablet ou computador.',
      'Sincronização em tempo real para equipes e múltiplos acessos.',
      'Suporte a dúvidas através do botão flutuante de ajuda (?) presente em todas as telas.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard: Visão 360° da Empresa',
    subtitle: 'Indicadores financeiros, vendas e metas em tempo real',
    description:
      'No Dashboard você acompanha receitas, despesas, saldo operacional líquido, previsão de caixa e gráficos mensais com diagnóstico instantâneo de superávit ou déficit.',
    icon: LayoutDashboard,
    route: '/dashboard',
    badge: 'Módulo Principal',
    highlights: [
      '4 cartões com totais do mês: Receitas, Despesas, Saldo Líquido e A Receber.',
      'Gráficos de barras de faturamento e linha de evolução real de caixa.',
      'Pizzas de custos por categoria e proportion donut de receitas vs despesas.',
      'Alertas dos 5 vencimentos mais urgentes para você nunca pagar juros.',
    ],
  },
  {
    id: 'pedidos_aberto',
    title: 'Controle de Pedidos em Aberto',
    subtitle: 'Acompanhamento de orçamentos enviados e entregas pendentes',
    description:
      'Monitore todas as propostas comerciais aguardando resposta do cliente e os pedidos da agenda em andamento, sabendo exatamente há quantos dias estão sem retorno.',
    icon: Clock,
    route: '/pedidos-em-aberto',
    badge: 'Operação',
    highlights: [
      'Visão consolidada de orçamentos enviados e agendamentos pendentes.',
      'Contador inteligente de dias em aberto com alerta de urgência.',
      'Ações rápidas para Aprovar & Vender com 1 clique ou Concluir entrega.',
      'Ordenação por mais tempo em aberto ou maiores valores em Reais.',
    ],
  },
  {
    id: 'vendas_orcamentos',
    title: 'Vendas Comerciais & Orçamentos',
    subtitle: 'Propostas com compartilhamento rápido e controle de pedidos',
    description:
      'Crie propostas comerciais completas com validade, itens e formas de pagamento, compartilhando instantaneamente pelo WhatsApp, e-mail ou PDF oficial.',
    icon: ShoppingCart,
    route: '/vendas',
    badge: 'Comercial',
    highlights: [
      'Geração de propostas em PDF prontas para envio com a marca da sua empresa.',
      'Baixa automática no estoque ao concluir a venda e estorno automático em cancelamento.',
      'Proteção contra estoque negativo e validação de quantidade disponível.',
    ],
  },
  {
    id: 'estoque_catalogo',
    title: 'Estoque, Catálogo com Fotos & Etiquetas',
    subtitle: 'Inventário completo, código de barras e comparativo de preços',
    description:
      'Organize seu catálogo físico com fotos dos produtos, preços de custo/venda, margens de markup, cotações de fornecedores e impressão de etiquetas adesivas Pimaco A4.',
    icon: Package,
    route: '/estoque',
    badge: 'Produtos & Compras',
    highlights: [
      'Impressão de folhas de etiquetas com código de barras Code 128.',
      'Visão de catálogo em cards fotográficos ou grade em tabela.',
      'Comparativo de cotações de insumos com destaque para o menor preço.',
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro, Contas & Fluxo de Caixa',
    subtitle: 'Contas a Pagar, Contas a Receber e Fluxo Projetado',
    description:
      'Tenha previsibilidade total mantendo o contas a pagar e receber em dia, além da aba de Fluxo de Caixa Projetado para os próximos 30, 60 ou 90 dias.',
    icon: ReceiptText,
    route: '/contas-a-receber',
    badge: 'Financeiro',
    highlights: [
      'Alertas preventivos de saldo negativo em datas futuras.',
      'Relatórios executivos oficiais gerados em PDF e planilhas em CSV.',
      'Livro caixa (Ledger) registrando todas as entradas e saídas.',
    ],
  },
  {
    id: 'metas_agenda',
    title: 'Metas de Crescimento & Agenda de Entregas',
    subtitle: 'Planeje os objetivos do negócio e compromissos com clientes',
    description:
      'Defina metas de faturamento, lucro líquido ou volume de vendas com acompanhamento automático em réguas, e organize os prazos de pedidos na agenda visual.',
    icon: Target,
    route: '/metas',
    badge: 'Gestão',
    highlights: [
      'Réguas de progresso automáticas que leem seus lançamentos em tempo real.',
      'Calendário operacional completo com compromissos diários e mensais.',
      'Tela diária de boas-vindas destacando as prioridades da manhã.',
    ],
  },
  {
    id: 'help_reminder',
    title: 'Dúvidas? O Ícone ? Está Sempre Aqui!',
    subtitle: 'Central de Ajuda, Tutoriais e Suporte a 1 Clique',
    description:
      'Você nunca estará sozinho: o botão flutuante com a interrogação (?) no canto inferior direito da tela abre a Central de Ajuda com manuais passo a passo, FAQ e busca instantânea.',
    icon: HelpCircle,
    badge: 'Sempre Disponível',
    highlights: [
      'Clique no botão verde flutuante (?) ou no menu Ajuda a qualquer momento.',
      'Busque por qualquer dúvida ou funcionalidade (ex: markup, cnpj, etiquetas).',
      'Você também pode refazer este tour a qualquer momento dentro da Central de Ajuda.',
    ],
  },
]

interface OnboardingTourProps {
  open: boolean
  onClose: (completed: boolean) => void
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1
  const IconComp = step.icon

  const handleNext = () => {
    if (isLastStep) {
      onClose(true)
    } else {
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      // Opcional: navegar suavemente para a rota do módulo
      const nextStep = TOUR_STEPS[nextIndex]
      if (nextStep?.route) {
        navigate(nextStep.route)
      }
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1
      setCurrentStepIndex(prevIndex)
      const prevStep = TOUR_STEPS[prevIndex]
      if (prevStep?.route) {
        navigate(prevStep.route)
      }
    }
  }

  const handleSkip = () => {
    onClose(true)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleSkip()}>
      <DialogContent className="max-w-xl w-[95vw] sm:w-[90vw] md:w-[580px] p-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-2xl gap-0">
        {/* Top Header com Gradiente */}
        <DialogHeader className="p-5 sm:p-6 bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white border-b border-slate-800 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              {step.badge}
            </span>
            <div className="text-xs text-slate-400 font-mono">
              Passo {currentStepIndex + 1} de {TOUR_STEPS.length}
            </div>
          </div>

          <div className="flex items-start gap-3.5 mt-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <IconComp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white leading-tight">
                {step.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-1">
                {step.subtitle}
              </DialogDescription>
            </div>
          </div>

          {/* Barra de Progresso do Tour */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </DialogHeader>

        {/* Corpo do Passo */}
        <div className="p-5 sm:p-6 space-y-4 text-left">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.description}</p>

          {/* Lista de Destaques */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Destaques Principais:
            </span>
            <div className="space-y-1.5">
              {step.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Destaque especial no último passo para o botão flutuante ? */}
          {isLastStep && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-950">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                ?
              </div>
              <div className="text-xs leading-snug">
                <p className="font-bold text-emerald-900">
                  Lembre-se sempre: o botão flutuante "?" no canto inferior direito
                </p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Está sempre disponível para tirar qualquer dúvida sobre a operação do sistema.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Navegação */}
        <DialogFooter className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2">
          {/* Botão Pular Tutorial */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="text-xs text-slate-500 hover:text-slate-800 h-9 px-3"
          >
            Pular Tutorial
          </Button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                className="text-xs text-slate-700 h-9 px-3 border-slate-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}

            <Button
              type="button"
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-xs flex items-center gap-1.5"
            >
              <span>{isLastStep ? 'Concluir Tour' : 'Avançar'}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OnboardingTour
