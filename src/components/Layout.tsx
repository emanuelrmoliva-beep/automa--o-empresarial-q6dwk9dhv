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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
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
        { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
        { path: '/clientes', label: 'Clientes', icon: Users },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { path: '/metas', label: 'Metas & Réguas', icon: Target },
        { path: '/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
        { path: '/receitas', label: 'Receitas', icon: ArrowDownLeft },
        { path: '/despesas', label: 'Despesas', icon: ArrowUpRight },
        { path: '/contas-a-pagar', label: 'Contas a Pagar', icon: CreditCard },
        { path: '/contas-a-receber', label: 'Contas a Receber', icon: ReceiptText },
      ],
    },
    {
      label: 'Produtos',
      items: [
        { path: '/estoque', label: 'Estoque', icon: Package },
        { path: '/formacao-de-precos', label: 'Formação de Preços', icon: Calculator },
        { path: '/entradas-saidas', label: 'Entradas e Saídas', icon: History },
      ],
    },
  ]

  // Identificar título da página atual
  const getPageTitle = () => {
    const p = location.pathname
    if (p.startsWith('/dashboard')) return 'Dashboard Operacional'
    if (p.startsWith('/agenda')) return 'Agenda de Pedidos e Entregas'
    if (p.startsWith('/metas')) return 'Sistema de Metas & Réguas'
    if (p.startsWith('/relatorios')) return 'Central de Relatórios'
    if (p.startsWith('/vendas')) return 'Vendas'
    if (p.startsWith('/clientes')) return 'Cadastro de Clientes'
    if (p.startsWith('/estoque')) return 'Controle de Estoque'
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800 justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 min-w-10 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
          {!isCollapsed && (
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
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-[280px] z-50">{sidebarContent}</div>
          </div>
        )}

        {/* Main Wrapper */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
            isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
          }`}
        >
          {/* TopBar */}
          <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {getPageTitle()}
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 capitalize">{todayStr}</p>
              </div>
            </div>

            {/* Right TopBar Actions */}
            <div className="flex items-center gap-3">
              <button
                className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                title="Notificações"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
              </button>

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
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            <Outlet />
          </main>

          {/* Global Footer */}
          <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
            Automação Empresarial © 2025 • Todos os direitos reservados
          </footer>
        </div>
      </div>
    </div>
  )
}

export default Layout
