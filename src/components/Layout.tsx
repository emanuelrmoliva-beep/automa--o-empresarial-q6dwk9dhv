import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Calculator,
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  CreditCard,
  History,
  Building2,
  FileText,
  Scale,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  Target,
  CalendarDays,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  Award,
  Layers,
} from 'lucide-react'
import HelpModal from '@/components/HelpModal'
import NotificationsDropdown from '@/components/NotificationsDropdown'
import OnboardingTour from '@/components/OnboardingTour'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getPbFileUrl, markUserTourCompleted, resetUserTour } from '@/services/erp'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export const Layout: React.FC = () => {
  const { user, company, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [initialHelpTopic, setInitialHelpTopic] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)

  // Checar se deve exibir o tour guiado no primeiro acesso após concluir onboarding da empresa
  React.useEffect(() => {
    if (user && company) {
      // Se user não tiver tour_completed_at preenchido e não estiver em onboarding
      const isCompleted = !!(user as any).tour_completed_at
      if (!isCompleted && !sessionStorage.getItem('tour_dismissed_session')) {
        setTourOpen(true)
      }
    }
  }, [user, company])

  const handleCloseTour = async (completed: boolean) => {
    setTourOpen(false)
    sessionStorage.setItem('tour_dismissed_session', 'true')
    if (user) {
      await markUserTourCompleted(user.id)
    }
    toast({
      title: 'Tour Concluído!',
      description:
        'Você pode consultar a Central de Ajuda a qualquer momento clicando no ícone "?"',
    })
  }

  const handleRestartTour = () => {
    setHelpOpen(false)
    setTourOpen(true)
  }

  const handleOpenHelp = (topicId?: string) => {
    setInitialHelpTopic(topicId || null)
    setHelpOpen(true)
  }

  const handleLogout = () => {
    logout()
    toast({
      title: 'Desconectado',
      description: 'Você saiu da conta.',
    })
    navigate('/')
  }

  const navGroups = [
    {
      label: 'Operação',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/agenda', label: 'Agenda & Entregas', icon: CalendarDays },
        { path: '/pedidos-em-aberto', label: 'Pedidos em Aberto', icon: Clock },
        { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
        { path: '/orcamentos', label: 'Orçamentos', icon: FileText },
        { path: '/clientes', label: 'Clientes', icon: Users },
        { path: '/fidelidade', label: 'Programa de Fidelidade', icon: Award },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { path: '/metas', label: 'Metas & Réguas', icon: Target },
        { path: '/relatorios', label: 'Relatórios & Projeção', icon: FileSpreadsheet },
        { path: '/receitas', label: 'Receitas', icon: ArrowDownLeft },
        { path: '/despesas', label: 'Despesas', icon: ArrowUpRight },
        { path: '/contas-a-pagar', label: 'Contas a Pagar', icon: CreditCard },
        { path: '/contas-a-receber', label: 'Contas a Receber', icon: ReceiptText },
      ],
    },
    {
      label: 'Produtos & Produção',
      items: [
        { path: '/estoque', label: 'Estoque & Catálogo', icon: Package },
        { path: '/producao', label: 'Controle de Produção', icon: Layers },
        { path: '/cotacoes', label: 'Cotações de Fornecedores', icon: Scale },
        { path: '/formacao-de-precos', label: 'Formação de Preços', icon: Calculator },
        { path: '/entradas-saidas', label: 'Entradas e Saídas', icon: History },
      ],
    },
    {
      label: 'Suporte & Ajuda',
      items: [
        {
          path: '#ajuda',
          label: 'Ajuda & Tutorial',
          icon: HelpCircle,
          isAction: true,
          action: () => {
            setMobileOpen(false)
            handleOpenHelp()
          },
        },
      ],
    },
  ]

  // Identificar título da página atual
  const getPageTitle = () => {
    const p = location.pathname
    if (p.startsWith('/dashboard')) return 'Dashboard Operacional'
    if (p.startsWith('/agenda')) return 'Agenda de Pedidos e Entregas'
    if (p.startsWith('/pedidos-em-aberto')) return 'Controle de Pedidos em Aberto'
    if (p.startsWith('/metas')) return 'Sistema de Metas & Réguas'
    if (p.startsWith('/relatorios')) return 'Central de Relatórios & Projeção'
    if (p.startsWith('/vendas')) return 'Vendas Comerciais'
    if (p.startsWith('/orcamentos')) return 'Orçamentos & Propostas'
    if (p.startsWith('/cotacoes')) return 'Cotações & Comparativo de Fornecedores'
    if (p.startsWith('/clientes/') && p.includes('/historico')) return 'Histórico do Cliente'
    if (p.startsWith('/clientes')) return 'Cadastro de Clientes'
    if (p.startsWith('/fidelidade')) return 'Programa de Fidelidade & Faixas'
    if (p.startsWith('/estoque')) return 'Controle de Estoque & Catálogo'
    if (p.startsWith('/producao')) return 'Controle de Produção & Rastreabilidade'
    if (p.startsWith('/formacao-de-precos')) return 'Formação de Preços & Markup'
    if (p.startsWith('/receitas')) return 'Receitas'
    if (p.startsWith('/despesas')) return 'Despesas'
    if (p.startsWith('/contas-a-pagar')) return 'Contas a Pagar'
    if (p.startsWith('/contas-a-receber')) return 'Contas a Receber'
    if (p.startsWith('/entradas-saidas')) return 'Ledger de Entradas e Saídas'
    if (p.startsWith('/configuracoes')) return 'Dados da Empresa'
    return 'Automação Empresarial'
  }

  const todayStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const userInitials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()
  const companyLogoUrl = company?.logo ? getPbFileUrl('companies', company.id, company.logo) : null

  const sidebarContent = (
    <div
      data-tour="sidebar-navigation"
      className="flex flex-col h-full bg-[#0F172A] text-slate-300 select-none"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800 justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          {companyLogoUrl ? (
            <div className="w-10 h-10 min-w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md p-1 border border-slate-700">
              <img
                src={companyLogoUrl}
                alt={company?.trade_name || 'Logo da Empresa'}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 min-w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md p-1">
              <img
                src="/app-icon.svg"
                alt="Ícone Automação Empresarial"
                className="w-8 h-8 rounded-lg"
              />
            </div>
          )}
          {(!isCollapsed || mobileOpen) && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-slate-100 text-sm tracking-tight truncate">
                {company?.trade_name || 'Automação Empresarial'}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium tracking-wide uppercase">
                ERP Empresarial
              </span>
            </div>
          )}
        </div>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                {group.label}
              </h4>
            )}
            {group.items.map((item: any) => {
              const Icon = item.icon
              const itemTourKey = item.path.replace('/', '').replace('#', '') || 'root'
              if (item.isAction) {
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    data-tour={`nav-${itemTourKey}`}
                    className="w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 text-left"
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                    {!isCollapsed && (
                      <span className="truncate flex items-center justify-between w-full font-semibold">
                        {item.label}
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                          ?
                        </span>
                      </span>
                    )}
                  </button>
                )
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-tour={`nav-${itemTourKey}`}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-emerald-500" />
                      )}
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive
                            ? 'text-emerald-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer user info & toggle */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/80">
          <div className="w-8 h-8 min-w-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
            {userInitials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {company?.city ? `${company.city}/${company.state}` : 'Gestor'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sair do sistema"
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop collapse button */}
        <div className="hidden lg:flex justify-end">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased">
      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-200 shadow-xl ${
            isCollapsed ? 'w-[72px]' : 'w-[260px]'
          }`}
        >
          {sidebarContent}
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-[290px] max-w-[85vw] z-50 shadow-2xl animate-in slide-in-from-left duration-200">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main Wrapper */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
            isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
          }`}
        >
          {/* TopBar */}
          <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition"
                aria-label="Abrir menu lateral"
              >
                <Menu className="w-6 h-6" />
              </button>
              {companyLogoUrl && (
                <div className="lg:hidden w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  {getPageTitle()}
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 capitalize">{todayStr}</p>
              </div>
            </div>

            {/* Right TopBar Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Botão de Ajuda no TopBar */}
              <button
                onClick={() => handleOpenHelp()}
                className="flex items-center gap-1.5 p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200"
                title="Ajuda & Tutorial do Sistema"
                aria-label="Abrir tutorial e ajuda"
              >
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <span className="hidden md:inline-block text-xs font-semibold text-emerald-800">
                  Ajuda
                </span>
              </button>

              {/* Dropdown de Notificações Ativo */}
              <div data-tour="notifications-bell">
                <NotificationsDropdown />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 p-1.5 sm:px-3 hover:bg-slate-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center">
                      {userInitials}
                    </div>
                    <div className="hidden sm:block text-left leading-tight">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                        {user?.name || user?.email}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        {company?.trade_name || 'Empresa'}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white shadow-lg border-slate-200"
                >
                  <DropdownMenuLabel className="font-normal text-xs text-slate-500">
                    Conectado como <strong className="text-slate-800">{user?.email}</strong>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/configuracoes')}
                    className="cursor-pointer text-slate-700"
                  >
                    <Settings className="w-4 h-4 mr-2 text-slate-500" />
                    Dados da Empresa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2 text-red-500" />
                    Sair do Sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content with smooth transition */}
          <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in pb-24 lg:pb-12 overflow-x-hidden">
            <Outlet />
          </main>

          {/* Global Footer */}
          <footer className="hidden lg:block py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
            Automação Empresarial © 2025 • Todos os direitos reservados
          </footer>

          {/* Botão Flutuante de Ajuda "?" (Canto Inferior Direito) */}
          <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40">
            <button
              data-tour="floating-help"
              onClick={() => handleOpenHelp()}
              className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
              title="Ajuda & Dúvidas sobre o sistema (?)"
              aria-label="Abrir Ajuda e Tutorial"
            >
              <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] group-hover:rotate-12 transition-transform" />
              {/* Tooltip flutuante sutil em desktop */}
              <span className="hidden sm:inline-block pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Dúvidas? Ver Tutorial
              </span>
            </button>
          </div>

          {/* Central de Ajuda & Tutorial Modal */}
          <HelpModal
            open={helpOpen}
            onOpenChange={setHelpOpen}
            initialTopicId={initialHelpTopic}
            onRestartTour={handleRestartTour}
          />

          {/* Tour Guiado de Primeiro Acesso */}
          <OnboardingTour
            open={tourOpen}
            onClose={handleCloseTour}
            onOpenMobileDrawer={() => setMobileOpen(true)}
            onCloseMobileDrawer={() => setMobileOpen(false)}
          />

          {/* Mobile Bottom Navigation Bar for quick thumb navigation */}
          <nav
            data-tour="mobile-bottom-nav"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-1.5 px-2 safe-area-pb shadow-lg"
          >
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <LayoutDashboard
                    className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : ''}`}
                  />
                  <span>Início</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/vendas"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <ShoppingCart
                    className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : ''}`}
                  />
                  <span>Vendas</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/orcamentos"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <FileText
                    className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : ''}`}
                  />
                  <span>Orçamentos</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/agenda"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <CalendarDays
                    className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : ''}`}
                  />
                  <span>Agenda</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/receitas"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <ReceiptText
                    className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : ''}`}
                  />
                  <span>Finanças</span>
                </>
              )}
            </NavLink>

            <button
              onClick={() => handleOpenHelp()}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition"
              aria-label="Abrir Ajuda e Tutorial"
            >
              <HelpCircle className="w-5 h-5 mb-0.5 stroke-[2.2]" />
              <span className="font-semibold">Ajuda</span>
            </button>

            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-900 transition"
              aria-label="Abrir menu de módulos"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>Menu</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default Layout
