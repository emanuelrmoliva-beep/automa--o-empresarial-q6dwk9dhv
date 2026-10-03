import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Package,
  CalendarDays,
  ExternalLink,
  Info,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/services/erp'
import { syncAndFetchNotifications } from '@/services/notificationsSync'
import type { ErpNotification, NotificationType } from '@/types/erp'
import { formatDatePtBr } from '@/lib/formatters'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export const NotificationsDropdown: React.FC = () => {
  const { user, company } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<ErpNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [open, setOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!company || !user) return
    try {
      setLoading(true)
      const list = await syncAndFetchNotifications(company.id, user.id)
      setNotifications(list)
    } catch (err) {
      console.error('Erro ao sincronizar notificações:', err)
    } finally {
      setLoading(false)
    }
  }, [company, user])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Atualização em tempo real quando notificações ou financeiro mudarem
  useRealtime('notifications', () => loadNotifications(), !!company)
  useRealtime('payables', () => loadNotifications(), !!company)
  useRealtime('receivables', () => loadNotifications(), !!company)
  useRealtime('products', () => loadNotifications(), !!company)
  useRealtime('agenda_events', () => loadNotifications(), !!company)

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n,
        ),
      )
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!company || !user) return
    try {
      setMarkingAll(true)
      await markAllNotificationsAsRead(company.id, user.id)
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })),
      )
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNotificationClick = (n: ErpNotification) => {
    if (!n.read) {
      markNotificationAsRead(n.id).catch(console.error)
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
      )
    }

    setOpen(false)

    // Redireciona para a tela correspondente
    if (n.type === 'vencimento_pagar') {
      navigate('/contas-a-pagar')
    } else if (n.type === 'vencimento_receber') {
      navigate('/contas-a-receber')
    } else if (n.type === 'estoque_baixo') {
      navigate('/estoque')
    } else if (n.type === 'agenda_hoje') {
      navigate('/agenda')
    } else {
      navigate('/dashboard')
    }
  }

  const getTypeStyle = (type: NotificationType) => {
    switch (type) {
      case 'vencimento_pagar':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          badgeText: 'A Pagar',
          badgeColor: 'bg-red-100 text-red-700',
        }
      case 'vencimento_receber':
        return {
          icon: Clock,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50 border-amber-200',
          badgeText: 'A Receber',
          badgeColor: 'bg-amber-100 text-amber-700',
        }
      case 'estoque_baixo':
        return {
          icon: Package,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50/70 border-amber-200',
          badgeText: 'Estoque',
          badgeColor: 'bg-amber-100 text-amber-800',
        }
      case 'agenda_hoje':
        return {
          icon: CalendarDays,
          iconColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50 border-emerald-200',
          badgeText: 'Agenda Hoje',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        }
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          badgeText: 'Aviso',
          badgeColor: 'bg-blue-100 text-blue-700',
        }
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          title={unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Notificações'}
          aria-label="Abrir notificações"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[94vw] sm:w-96 max-h-[85vh] bg-white border-slate-200 shadow-xl rounded-2xl p-0 overflow-hidden flex flex-col"
      >
        {/* Header do Dropdown */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 tracking-tight flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-600" />
              Notificações do Sistema
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                {unreadCount} nova(s)
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 h-7 px-2 font-semibold"
            >
              {markingAll ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="w-3 h-3 mr-1" />
              )}
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista de Notificações */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              Verificando vencimentos e estoque...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-600">Tudo em dia! 🎉</p>
              <p className="text-[11px]">
                Nenhum título vencido, estoque regular e sem pendências para hoje.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const style = getTypeStyle(n.type)
              const Icon = style.icon

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 transition cursor-pointer flex items-start gap-2.5 hover:bg-slate-50/80 ${
                    !n.read ? 'bg-emerald-50/20' : 'opacity-75'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${style.bgColor}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${style.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${style.badgeColor}`}
                      >
                        {style.badgeText}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDatePtBr(n.created.split('T')[0])}
                      </span>
                    </div>

                    <h4
                      className={`text-xs leading-snug truncate ${
                        !n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {n.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.body}
                    </p>
                  </div>

                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, n.id)}
                      className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition shrink-0"
                      title="Marcar como lida"
                      aria-label="Marcar como lida"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé com atalhos */}
        <div className="p-2.5 bg-slate-50/80 border-t border-slate-200 text-center flex items-center justify-between px-3 text-[11px] text-slate-500">
          <span>Alertas calculados em tempo real</span>
          <button
            onClick={() => {
              setOpen(false)
              navigate('/relatorios')
            }}
            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
          >
            Ver Relatórios <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationsDropdown
