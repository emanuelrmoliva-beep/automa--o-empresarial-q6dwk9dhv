import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  Package,
  ReceiptText,
  Target,
  HelpCircle,
  Bell,
  Menu,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  PieChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TourStep {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  route?: string
  selector?: string
  mobileSelector?: string
  needsMobileDrawer?: boolean
  badge: string
  highlights?: string[]
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Automação Empresarial! 🚀',
    subtitle: 'Conheça o seu ERP de Gestão Completa',
    description:
      'Preparamos este tour interativo para guiar você pelas funções reais da interface. Cada passo ilumina o elemento em destaque na tela para você saber exatamente onde operar cada função!',
    icon: Sparkles,
    route: '/dashboard',
    badge: 'Início do Tour',
    highlights: [
      'Elementos reais destacados na tela passo a passo.',
      'Acesse de computador, tablet ou celular com a mesma facilidade.',
      'Você pode pausar ou refazer este tour a qualquer momento no ícone "?".',
    ],
  },
  {
    id: 'sidebar_menu',
    title: 'Menu Lateral & Módulos da Empresa',
    subtitle: 'Navegação organizada por setores de negócio',
    description:
      'Aqui você tem acesso a todos os setores: Operação (vendas, orçamentos, agenda), Financeiro (caixa, contas, metas) e Produtos & Compras (estoque, etiquetas, fornecedores).',
    icon: Menu,
    selector: '[data-tour="sidebar-navigation"]',
    mobileSelector: '[data-tour="mobile-bottom-nav"]',
    needsMobileDrawer: true,
    badge: 'Navegação',
    highlights: [
      'Agrupamento inteligente por áreas de responsabilidade.',
      'No celular, acesse pela barra inferior de atalhos ou pelo botão "Menu".',
    ],
  },
  {
    id: 'dashboard_cards',
    title: 'Dashboard: Visão Geral em Tempo Real',
    subtitle: 'Métricas de receitas, despesas e pedidos pendentes',
    description:
      'Estes cartões consolidam as receitas do mês, despesas pagas, saldo operacional líquido e o total de orçamentos e pedidos aguardando retorno do cliente.',
    icon: LayoutDashboard,
    route: '/dashboard',
    selector: '[data-tour="dashboard-metrics"]',
    badge: 'Visão 360°',
    highlights: [
      'Valores sincronizados em tempo real conforme você lança vendas ou quita títulos.',
      'Clique direto nos cartões para abrir os detalhes de cada setor.',
    ],
  },
  {
    id: 'dashboard_charts',
    title: 'Gráficos de Custos e Proporção',
    subtitle: 'Distribuição por categoria e diagnóstico de superávit',
    description:
      'Veja para onde está indo o dinheiro da empresa no gráfico de pizza por categoria e confira na proporção donut se o mês está em superávit ou déficit.',
    icon: PieChart,
    route: '/dashboard',
    selector: '[data-tour="dashboard-charts"]',
    badge: 'Inteligência Financeira',
    highlights: [
      'Pizza de custos categorizados para corte inteligente de gastos.',
      'Donut de receitas vs despesas para diagnóstico rápido da saúde do negócio.',
    ],
  },
  {
    id: 'notifications_bell',
    title: 'Sino de Notificações Inteligentes',
    subtitle: 'Alertas de contas vencidas e produtos com estoque baixo',
    description:
      'O sino verifica automaticamente se há títulos a pagar ou a receber que venceram hoje ou estão atrasados, itens que atingiram o estoque mínimo e entregas do dia.',
    icon: Bell,
    selector: '[data-tour="notifications-bell"]',
    badge: 'Alertas em Tempo Real',
    highlights: [
      'Contador de avisos não lidos atualizado instantaneamente.',
      'Clique em qualquer aviso para navegar direto ao título ou produto.',
    ],
  },
  {
    id: 'pedidos_em_aberto',
    title: 'Pedidos em Aberto & Prazos de Resposta',
    subtitle: 'Monitore orçamentos enviados e agendamentos pendentes',
    description:
      'Acompanhe quantos dias cada proposta comercial está sem retorno do cliente e faça aprovação e baixa de estoque com apenas 1 clique.',
    icon: Clock,
    route: '/pedidos-em-aberto',
    selector: '[data-tour="nav-pedidos-em-aberto"]',
    needsMobileDrawer: true,
    badge: 'Operação Comercial',
    highlights: [
      'Contador inteligente de dias em aberto com sinalização de urgência.',
      'Botão "Aprovar & Vender" com 1 clique para não perder vendas.',
    ],
  },
  {
    id: 'vendas_modulo',
    title: 'Vendas Comerciais & Baixa de Estoque',
    subtitle: 'Registro de vendas com validação de disponibilidade',
    description:
      'Registre vendas à vista, a prazo ou parceladas. O estoque do produto é debitado na hora e a receita entra no fluxo de caixa da empresa automaticamente.',
    icon: ShoppingCart,
    route: '/vendas',
    selector: '[data-tour="nav-vendas"]',
    mobileSelector: '[data-tour="mobile-bottom-nav"]',
    badge: 'Faturamento',
    highlights: [
      'Proteção rigorosa contra estoque negativo.',
      'Estorno automático de estoque caso a venda seja cancelada.',
    ],
  },
  {
    id: 'estoque_modulo',
    title: 'Estoque, Catálogo com Fotos & Etiquetas',
    subtitle: 'Inventário completo, código de barras Code 128 e fotos',
    description:
      'Organize seu catálogo físico com fotos, preços de custo, margem de markup e gere folhas A4 completas de etiquetas de gôndola com código de barras prontas para imprimir.',
    icon: Package,
    route: '/estoque',
    selector: '[data-tour="nav-estoque"]',
    needsMobileDrawer: true,
    badge: 'Catálogo & Produtos',
    highlights: [
      'Impressão de etiquetas Code 128 compatíveis com impressoras e leitores comuns.',
      'Visualização em cards fotográficos ou grade em tabela.',
    ],
  },
  {
    id: 'financeiro_modulo',
    title: 'Financeiro: Contas a Pagar, Receber e Projeção',
    subtitle: 'Controle de caixa, conciliação e fluxo projetado',
    description:
      'Mantenha as datas de vencimento em dia para nunca pagar juros ou deixar clientes inadimplentes. Conte também com o fluxo de caixa projetado para 30, 60 e 90 dias.',
    icon: ReceiptText,
    route: '/contas-a-receber',
    selector: '[data-tour="nav-contas-a-receber"]',
    needsMobileDrawer: true,
    badge: 'Previsibilidade',
    highlights: [
      'Alerta preventivo de risco de saldo negativo futuro.',
      'Relatórios executivos oficiais gerados em PDF e planilhas em CSV.',
    ],
  },
  {
    id: 'metas_modulo',
    title: 'Metas & Réguas de Crescimento',
    subtitle: 'Objetivos claros de faturamento e lucro',
    description:
      'Defina metas mensais, trimestrais ou anuais. O sistema calcula automaticamente o percentual atingido lendo suas receitas reais e atualiza a régua de progresso.',
    icon: Target,
    route: '/metas',
    selector: '[data-tour="nav-metas"]',
    needsMobileDrawer: true,
    badge: 'Crescimento',
    highlights: [
      'Réguas de progresso que se atualizam sozinhas com os lançamentos.',
      'Acompanhamento do progresso no próprio Dashboard.',
    ],
  },
  {
    id: 'floating_help',
    title: 'Central de Ajuda & Botão "?" Flutuante',
    subtitle: 'Tutoriais e manuais passo a passo sempre disponíveis',
    description:
      'O botão verde flutuante com a interrogação (?) no canto inferior direito está presente em todas as telas. Sempre que tiver qualquer dúvida operacional, basta clicar nele para abrir a Central de Ajuda!',
    icon: HelpCircle,
    selector: '[data-tour="floating-help"]',
    badge: 'Sempre Disponível',
    highlights: [
      'Busca instantânea por qualquer funcionalidade ou termo.',
      'FAQ com respostas rápidas e botão para refazer este tour a qualquer momento.',
    ],
  },
  {
    id: 'conclusion',
    title: 'Tudo pronto para acelerar seu negócio! 🎯',
    subtitle: 'Você concluiu o tour interativo do Automação Empresarial',
    description:
      'Agora você já conhece os principais atalhos e ferramentas do ERP. Comece cadastrando seus primeiros produtos, registrando clientes ou criando uma proposta comercial!',
    icon: CheckCircle2,
    route: '/dashboard',
    badge: 'Pronto para Operar',
    highlights: [
      'Cadastre produtos em Estoque para alimentar seu inventário.',
      'Crie propostas comerciais em Orçamentos e envie via WhatsApp.',
      'Lembre-se: o botão "?" está sempre ao seu lado para tirar dúvidas.',
    ],
  },
]

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

interface OnboardingTourProps {
  open: boolean
  onClose: (completed: boolean) => void
  onOpenMobileDrawer?: () => void
  onCloseMobileDrawer?: () => void
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  open,
  onClose,
  onOpenMobileDrawer,
  onCloseMobileDrawer,
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<
    'top' | 'bottom' | 'center' | 'left' | 'right'
  >('center')
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const [isMobile, setIsMobile] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1
  const IconComp = step.icon

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Localizar elemento alvo e posicionar spotlight + popover
  const updateTargetAndPopover = useCallback(() => {
    if (!open) return

    // Se o passo atual não possui seletor (ex: boas-vindas inicial ou conclusão), posiciona centralizado
    const activeSelector = isMobile && step.mobileSelector ? step.mobileSelector : step.selector

    if (!activeSelector) {
      setTargetRect(null)
      setPopoverPosition('center')
      setPopoverStyle({})
      return
    }

    const element = document.querySelector(activeSelector) as HTMLElement | null

    if (!element) {
      // Elemento ainda não encontrado na tela atual
      setTargetRect(null)
      setPopoverPosition('center')
      setPopoverStyle({})
      return
    }

    // Scroll elemento para a visualização suavemente se necessário
    const rect = element.getBoundingClientRect()
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)

    if (!isInViewport) {
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      } catch {
        // Fallback
      }
    }

    // Recalcular rect após pequeno delay ou direto
    const updatedRect = element.getBoundingClientRect()
    // Padding extra ao redor do elemento para o spotlight respirar
    const padding = 6
    const spotlight: SpotlightRect = {
      top: Math.max(0, updatedRect.top - padding),
      left: Math.max(0, updatedRect.left - padding),
      width: Math.min(window.innerWidth, updatedRect.width + padding * 2),
      height: updatedRect.height + padding * 2,
      right: updatedRect.right + padding,
      bottom: updatedRect.bottom + padding,
    }

    setTargetRect(spotlight)

    // Calcular melhor posição para o popover
    const vpWidth = window.innerWidth
    const vpHeight = window.innerHeight
    const popoverWidth = Math.min(vpWidth - 24, 460)
    const popoverEstHeight = 360

    if (vpWidth < 640) {
      // No celular estreito: se tiver espaço em cima ou embaixo, posiciona com margem; senão centraliza
      const spaceBelow = vpHeight - spotlight.bottom
      const spaceAbove = spotlight.top

      if (spaceBelow >= 300) {
        setPopoverPosition('bottom')
        setPopoverStyle({
          top: `${Math.min(vpHeight - popoverEstHeight - 16, spotlight.bottom + 12)}px`,
          left: '12px',
          right: '12px',
          width: 'calc(100vw - 24px)',
          maxWidth: '460px',
        })
      } else if (spaceAbove >= 300) {
        setPopoverPosition('top')
        setPopoverStyle({
          bottom: `${Math.max(16, vpHeight - spotlight.top + 12)}px`,
          left: '12px',
          right: '12px',
          width: 'calc(100vw - 24px)',
          maxWidth: '460px',
        })
      } else {
        // Centralizado na tela
        setPopoverPosition('center')
        setPopoverStyle({})
      }
      return
    }

    // Desktop / Tablet
    const spaceBelow = vpHeight - spotlight.bottom
    const spaceAbove = spotlight.top
    const spaceRight = vpWidth - spotlight.right
    const spaceLeft = spotlight.left

    // Preferência 1: À direita (ótimo para menu lateral esquerdo)
    if (spotlight.left < 300 && spaceRight >= popoverWidth + 24) {
      const topIdeal = Math.max(
        16,
        Math.min(
          vpHeight - popoverEstHeight - 16,
          spotlight.top + (spotlight.height - popoverEstHeight) / 2,
        ),
      )
      setPopoverPosition('right')
      setPopoverStyle({
        top: `${topIdeal}px`,
        left: `${spotlight.right + 16}px`,
        width: `${popoverWidth}px`,
      })
      return
    }

    // Preferência 2: Abaixo do elemento
    if (spaceBelow >= popoverEstHeight + 20) {
      const leftIdeal = Math.max(
        16,
        Math.min(
          vpWidth - popoverWidth - 16,
          spotlight.left + (spotlight.width - popoverWidth) / 2,
        ),
      )
      setPopoverPosition('bottom')
      setPopoverStyle({
        top: `${spotlight.bottom + 14}px`,
        left: `${leftIdeal}px`,
        width: `${popoverWidth}px`,
      })
      return
    }

    // Preferência 3: Acima do elemento (ex: botão flutuante no rodapé)
    if (spaceAbove >= popoverEstHeight + 20) {
      const leftIdeal = Math.max(
        16,
        Math.min(
          vpWidth - popoverWidth - 16,
          spotlight.left + (spotlight.width - popoverWidth) / 2,
        ),
      )
      setPopoverPosition('top')
      setPopoverStyle({
        bottom: `${vpHeight - spotlight.top + 14}px`,
        left: `${leftIdeal}px`,
        width: `${popoverWidth}px`,
      })
      return
    }

    // Preferência 4: À esquerda (ex: notificações no canto direito)
    if (spaceLeft >= popoverWidth + 20) {
      const topIdeal = Math.max(16, Math.min(vpHeight - popoverEstHeight - 16, spotlight.top + 10))
      setPopoverPosition('left')
      setPopoverStyle({
        top: `${topIdeal}px`,
        left: `${spotlight.left - popoverWidth - 16}px`,
        width: `${popoverWidth}px`,
      })
      return
    }

    // Fallback: Centro
    setPopoverPosition('center')
    setPopoverStyle({})
  }, [open, isMobile, step])

  // Gerenciar navegação e gaveta mobile ao mudar de passo
  useEffect(() => {
    if (!open) return

    // Se o passo requer rota diferente da atual, navegar
    if (step.route && location.pathname !== step.route) {
      navigate(step.route)
    }

    // Se estiver no mobile e o passo precisa destacar item do menu lateral
    if (isMobile && step.needsMobileDrawer && !step.mobileSelector) {
      onOpenMobileDrawer?.()
    } else {
      // Fecha a gaveta para passos normais
      onCloseMobileDrawer?.()
    }

    // Aguardar render da nova rota / animação de abertura
    const t1 = setTimeout(updateTargetAndPopover, 120)
    const t2 = setTimeout(updateTargetAndPopover, 350)
    const t3 = setTimeout(updateTargetAndPopover, 700)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [
    open,
    currentStepIndex,
    step,
    location.pathname,
    navigate,
    isMobile,
    onOpenMobileDrawer,
    onCloseMobileDrawer,
    updateTargetAndPopover,
  ])

  // Atualizar spotlight em resize ou scroll da página
  useEffect(() => {
    if (!open) return
    const handleScrollOrResize = () => {
      updateTargetAndPopover()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open, updateTargetAndPopover])

  if (!open) return null

  const handleNext = () => {
    if (isLastStep) {
      onCloseMobileDrawer?.()
      onClose(true)
    } else {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const handleSkip = () => {
    onCloseMobileDrawer?.()
    onClose(true)
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto select-none"
      aria-label="Tour interativo do sistema"
      role="dialog"
      aria-modal="true"
    >
      {/* Camada SVG de Spotlight: Escurece a tela e recorta com furo transparente o alvo */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Tudo branco = fundo visível (escuro) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Retângulo preto com cantos arredondados = buraco transparente onde a interface aparece 100% iluminada */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="12"
                ry="12"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>

        {/* Fundo escuro com a máscara aplicada */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Anel Pulsante Verde ao redor do alvo destacado para atrair os olhos do usuário */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl border-2 border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.65)] ring-4 ring-emerald-500/20 animate-pulse transition-all duration-300 ease-out z-[101]"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
        >
          {/* Tag de destaque "Função em Destaque" no topo do recorte */}
          <div className="absolute -top-3 left-3 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping inline-block" />
            Em Foco
          </div>
        </div>
      )}

      {/* Balão / Popover do Tour Interativo */}
      <div
        ref={cardRef}
        style={popoverPosition === 'center' ? {} : popoverStyle}
        className={`fixed z-[102] transition-all duration-300 ease-out ${
          popoverPosition === 'center'
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] sm:w-[500px] max-w-[520px]'
            : ''
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-200 max-h-[88vh]">
          {/* Header com Gradiente Sofisticado */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {step.badge}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  Passo {currentStepIndex + 1} de {TOUR_STEPS.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-slate-400 hover:text-white p-1 rounded-md transition"
                  title="Pular tour (X)"
                  aria-label="Pular tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 mt-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <IconComp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                  {step.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                  {step.subtitle}
                </p>
              </div>
            </div>

            {/* Barra de Progresso Suave */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-3.5">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Corpo do Balão com Rolagem Suave se Necessário */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[48vh] text-left">
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {step.description}
            </p>

            {/* Destaques do Elemento */}
            {step.highlights && step.highlights.length > 0 && (
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  O que você pode fazer aqui:
                </span>
                <div className="space-y-1">
                  {step.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aviso visual para o botão flutuante quando for o penúltimo ou último passo */}
            {step.id === 'floating_help' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-950">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  ?
                </div>
                <p className="text-xs text-emerald-900 leading-snug">
                  <strong>Dica de ouro:</strong> Sempre que tiver uma dúvida, basta clicar no botão
                  flutuante verde para acessar o guia completo com busca por palavras-chave!
                </p>
              </div>
            )}
          </div>

          {/* Rodapé com Botões de Navegação */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-800 h-8 px-2.5"
            >
              Pular tour
            </Button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="text-xs text-slate-700 h-8 px-2.5 border-slate-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 px-3.5 shadow-xs flex items-center gap-1.5"
              >
                <span>{isLastStep ? 'Concluir Tour' : 'Avançar'}</span>
                {isLastStep ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour
