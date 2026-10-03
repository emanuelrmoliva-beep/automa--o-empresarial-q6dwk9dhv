import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Users,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Building,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  History,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/services/erp'
import type { Customer } from '@/types/erp'
import {
  maskCpf,
  maskCnpj,
  maskPhone,
  validateCpf,
  validateCnpj,
  fetchAddressByCep,
} from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'

const ITEMS_PER_PAGE = 12

export const Clientes: React.FC = () => {
  const navigate = useNavigate()
  const { company } = useAuth()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [clientType, setClientType] = useState<'Pessoa Jurídica' | 'Pessoa Física'>(
    'Pessoa Jurídica',
  )
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal Exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const data = await getCustomers(company.id)
      setCustomers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('customers', () => loadData(), !!company)

  const openCreateModal = () => {
    setEditingCustomer(null)
    setClientType('Pessoa Jurídica')
    setName('')
    setDocument('')
    setEmail('')
    setPhone('')
    setAddress('')
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c)
    setClientType(c.client_type)
    setName(c.name)
    setDocument(c.document)
    setEmail(c.email || '')
    setPhone(c.phone || '')
    setAddress(c.address || '')
    setNotes(c.notes || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Nome obrigatório' })
      return
    }

    if (clientType === 'Pessoa Jurídica') {
      if (!validateCnpj(document)) {
        toast({ variant: 'destructive', title: 'CNPJ inválido' })
        return
      }
    } else {
      if (!validateCpf(document)) {
        toast({ variant: 'destructive', title: 'CPF inválido' })
        return
      }
    }

    try {
      setSubmitting(true)
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          client_type: clientType,
          name,
          document,
          email,
          phone,
          address,
          notes,
        })
        toast({ title: 'Cliente atualizado!' })
      } else {
        await createCustomer({
          company_id: company.id,
          client_type: clientType,
          name,
          document,
          email,
          phone,
          address,
          notes,
        })
        toast({ title: 'Cliente cadastrado com sucesso!' })
      }
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar cliente',
        description: err?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteCustomer(deleteTargetId)
      toast({ title: 'Cliente removido' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err?.message })
    }
  }

  // Filtragem e paginação
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchTerm.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.document.includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      )
    })
  }, [customers, searchTerm])

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCustomers, currentPage])

  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-emerald-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-teal-500',
      'bg-rose-500',
      'bg-amber-500',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Clientes</h2>
          <p className="text-sm text-slate-500">
            Cadastre e gerencie sua carteira de clientes físicos e jurídicos.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Nenhum cliente cadastrado"
          description="Cadastre clientes para vincular a vendas e contas a receber."
          actionLabel="+ Novo Cliente"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getAvatarBg(
                        cust.name,
                      )}`}
                    >
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{cust.name}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        {cust.client_type === 'Pessoa Jurídica' ? (
                          <Building className="w-3 h-3 text-slate-400" />
                        ) : (
                          <UserIcon className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{cust.client_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => navigate(`/clientes/${cust.id}/historico`)}
                      className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                      title="Ver Histórico do Cliente (Compras, Orçamentos, Pagamentos)"
                      aria-label="Ver Histórico"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(cust)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(cust.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p className="font-mono text-slate-700 font-medium">Doc: {cust.document}</p>
                  {cust.email && (
                    <p className="flex items-center gap-1.5 text-slate-500 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </p>
                  )}
                  {cust.phone && (
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </p>
                  )}
                  {cust.address && (
                    <p className="flex items-center gap-1.5 text-slate-500 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {cust.notes && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic line-clamp-2">
                  Obs: {cust.notes}
                </div>
              )}

              {/* Ação rápida para Histórico */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/clientes/${cust.id}/historico`)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  Ver Histórico Completo
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {cust.id.slice(0, 6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500">
            Mostrando {paginatedCustomers.length} de {filteredCustomers.length} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs h-8"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
            </Button>
            <span className="text-xs font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs h-8"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Pessoa</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={clientType === 'Pessoa Jurídica' ? 'default' : 'outline'}
                  onClick={() => {
                    setClientType('Pessoa Jurídica')
                    setDocument('')
                  }}
                  className={`text-xs h-9 ${
                    clientType === 'Pessoa Jurídica'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : ''
                  }`}
                >
                  <Building className="w-3.5 h-3.5 mr-1.5" /> Pessoa Jurídica (PJ)
                </Button>
                <Button
                  type="button"
                  variant={clientType === 'Pessoa Física' ? 'default' : 'outline'}
                  onClick={() => {
                    setClientType('Pessoa Física')
                    setDocument('')
                  }}
                  className={`text-xs h-9 ${
                    clientType === 'Pessoa Física'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : ''
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 mr-1.5" /> Pessoa Física (PF)
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custName" className="text-xs font-semibold text-slate-700">
                Nome / Razão Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="custName"
                placeholder={clientType === 'Pessoa Jurídica' ? 'Razão Social' : 'Nome Completo'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custDoc" className="text-xs font-semibold text-slate-700">
                {clientType === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="custDoc"
                placeholder={
                  clientType === 'Pessoa Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'
                }
                value={document}
                onChange={(e) =>
                  setDocument(
                    clientType === 'Pessoa Jurídica'
                      ? maskCnpj(e.target.value)
                      : maskCpf(e.target.value),
                  )
                }
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custEmail" className="text-xs font-semibold text-slate-700">
                  E-mail
                </Label>
                <Input
                  id="custEmail"
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custPhone" className="text-xs font-semibold text-slate-700">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="custPhone"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custAddress" className="text-xs font-semibold text-slate-700">
                Endereço Completo
              </Label>
              <Input
                id="custAddress"
                placeholder="Rua, Número, Bairro, Cidade/UF"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custNotes" className="text-xs font-semibold text-slate-700">
                Observações
              </Label>
              <Textarea
                id="custNotes"
                placeholder="Condições comerciais, preferências, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none h-16"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Cliente'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir Cliente?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Deseja remover este cliente? Os registros vinculados (como vendas) manterão o histórico
            histórico.
          </p>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Clientes
