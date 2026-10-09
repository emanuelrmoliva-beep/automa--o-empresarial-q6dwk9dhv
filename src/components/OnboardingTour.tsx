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
    subtitle: 'Gestão simples e completa para sua empresa',
    description:
      'Preparamos este passo a passo rápido para mostrar onde fica cada função importante. Você vai aprender a controlar vendas, estoque, finanças e entregas sem complicação.',
    icon: Sparkles,
    route: '/dashboard',
    badge: 'Início',
    highlights: [
      'Destaque iluminado na tela mostrando onde clicar.',
      'Funciona no computador, tablet e celular.',
      'Você pode rever este tour sempre que quiser no botão de ajuda "?".',
    ],
  },
  {
    id: 'sidebar_menu',
    title: 'Menu Principal & Todos os Módulos',
    subtitle: 'Tudo organizado por setor da empresa',
    description:
      'Neste menu você encontra tudo: Vendas, Orçamentos, Agenda de Entregas, Estoque, Finanças (a pagar e receber), Metas e Produção de Lotes.',
    icon: Menu,
    selector: '[data-tour="sidebar-navigation"]',
    mobileSelector: '[data-tour="mobile-bottom-nav"]',
    needsMobileDrawer: true,
    badge: 'Navegação',
    highlights: [
      'Módulos divididos por cores e ícones fáceis de achar.',
      'No celular, use a barra na parte de baixo ou o botão "Menu".',
    ],
  },
  {
    id: 'dashboard_cards',
    title: 'Painel Principal: O Caixa do seu Negócio',
    subtitle: 'Receitas, despesas e saldo do mês na hora',
    description:
      'Estes cartões mostram quanto dinheiro entrou, quanto já foi pago de despesas e qual é o lucro limpo do mês corrente. Mostram também pedidos que ainda aguardam resposta.',
    icon: LayoutDashboard,
    route: '/dashboard',
    selector: '[data-tour="dashboard-metrics"]',
    badge: 'Painel',
    highlights: [
      'Valores calculados na hora a cada venda ou pagamento feito.',
      'Clique em qualquer cartão para ver a lista completa de contas.',
    ],
  },
  {
    id: 'dashboard_charts',
    title: 'Gráficos de Gastos e Faturamento',
    subtitle: 'Descubra para onde vai o seu dinheiro',
    description:
      'O gráfico de pizza divide seus gastos por categorias (aluguel, água, insumos, etc.). O gráfico de barras mostra o histórico de vendas dos últimos meses.',
    icon: PieChart,
    route: '/dashboard',
    selector: '[data-tour="dashboard-charts"]',
    badge: 'Gráficos',
    highlights: [
      'Descubra rápido onde cortar despesas desnecessárias.',
      'Acompanhe se a empresa está fechando o mês no azul.',
    ],
  },
  {
    id: 'notifications_bell',
    title: 'Sininho de Alertas Importantes',
    subtitle: 'Contas que vencem hoje e produtos acabando',
    description:
      'O sistema avisa sozinho quando uma conta venceu, quando há entregas para o dia ou quando o estoque de algum item ficou perigosamente baixo.',
    icon: Bell,
    selector: '[data-tour="notifications-bell"]',
    badge: 'Alertas',
    highlights: [
      'Número vermelho avisando quantas pendências precisam de atenção.',
      'Clique no aviso para ir direto na conta ou produto correspondente.',
    ],
  },
  {
    id: 'pedidos_em_aberto',
    title: 'Pedidos e Propostas em Aberto',
    subtitle: 'Não deixe clientes esperando nem perca vendas',
    description:
      'Veja quais orçamentos enviados ainda estão sem resposta do cliente e quanto tempo estão parados. Com um clique em "Aprovar", ele vira venda concluída.',
    icon: Clock,
    route: '/pedidos-em-aberto',
    selector: '[data-tour="nav-pedidos-em-aberto"]',
    needsMobileDrawer: true,
    badge: 'Vendas',
    highlights: [
      'Sinalizador visual de orçamentos parados há muitos dias.',
      'Aprovação rápida dando baixa imediata no estoque.',
    ],
  },
  {
    id: 'vendas_modulo',
    title: 'Balcão de Vendas & Baixa de Estoque',
    subtitle: 'Venda à vista, a prazo ou parcelada',
    description:
      'Adicione produtos, selecione o cliente e escolha a forma de pagamento. O estoque sai na hora e o dinheiro cai no seu caixa ou nas contas a receber.',
    icon: ShoppingCart,
    route: '/vendas',
    selector: '[data-tour="nav-vendas"]',
    mobileSelector: '[data-tour="mobile-bottom-nav"]',
    badge: 'Vendas',
    highlights: [
      'Aviso na tela se você tentar vender produto sem estoque.',
      'Vínculo direto com lotes de fabricação quando houver.',
    ],
  },
  {
    id: 'estoque_modulo',
    title: 'Estoque, Fotos e Impressão de Etiquetas',
    subtitle: 'Controle de mercadorias com código de barras',
    description:
      'Cadastre produtos com foto, preço de custo e preço de venda. Imprima folhas A4 prontas com etiquetas adesivas de preço e código de barras para suas prateleiras.',
    icon: Package,
    route: '/estoque',
    selector: '[data-tour="nav-estoque"]',
    needsMobileDrawer: true,
    badge: 'Produtos',
    highlights: [
      'Etiquetas prontas com código de barras e QR Code.',
      'Ajuste rápido de quantidade para contagens de inventário.',
    ],
  },
  {
    id: 'financeiro_modulo',
    title: 'Contas a Pagar, Receber e Futuro do Caixa',
    subtitle: 'Chega de esquecer boletos ou pagar multas',
    description:
      'Cadastre o que tem a pagar e a receber com as datas certas. O gráfico de projeção avisa com até 90 dias de antecedência se faltará dinheiro no caixa.',
    icon: ReceiptText,
    route: '/contas-a-receber',
    selector: '[data-tour="nav-contas-a-receber"]',
    needsMobileDrawer: true,
    badge: 'Financeiro',
    highlights: [
      'Alerta antes de o caixa ficar negativo.',
      'Exportação de relatórios em PDF e Excel para seu contador.',
    ],
  },
  {
    id: 'metas_modulo',
    title: 'Metas e Réguas de Faturamento',
    subtitle: 'Defina objetivos e acompanhe o crescimento',
    description:
      'Crie metas de vendas ou de economia para comprar um maquinário. Conforme as vendas acontecem, as barrinhas verdes enchem sozinhas mostrando seu progresso.',
    icon: Target,
    route: '/metas',
    selector: '[data-tour="nav-metas"]',
    needsMobileDrawer: true,
    badge: 'Metas',
    highlights: [
      'Barras de progresso que atualizam a cada venda realizada.',
      'Acompanhamento direto na primeira tela do painel.',
    ],
  },
  {
    id: 'floating_help',
    title: 'Botão Verde de Ajuda (?) Sempre Visível',
    subtitle: 'Manuais fáceis e respostas para qualquer dúvida',
    description:
      'Está com dúvida sobre como fazer alguma coisa? Basta clicar neste botão com interrogação (?) no cantinho da tela para abrir o guia com busca rápida.',
    icon: HelpCircle,
    selector: '[data-tour="floating-help"]',
    badge: 'Ajuda',
    highlights: [
      'Pesquise por qualquer palavra para ver o passo a passo.',
      'Perguntas Frequentes (FAQ) com explicações bem simples.',
    ],
  },
  {
    id: 'conclusion',
    title: 'Tudo pronto para usar! 🎯',
    subtitle: 'Você concluiu a apresentação do sistema',
    description:
      'Agora você já conhece os principais pontos do sistema. O melhor jeito de aprender é começar: cadastre seus produtos em Estoque ou registre sua primeira venda!',
    icon: CheckCircle2,
    route: '/dashboard',
    badge: 'Concluído',
    highlights: [
      'Comece cadastrando produtos no módulo Estoque.',
      'Envie orçamentos profissionais direto pelo WhatsApp do cliente.',
      'Lembre-se: o botão de ajuda (?) está sempre disponível.',
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
