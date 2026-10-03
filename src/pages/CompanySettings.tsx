import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { updateCompany } from '@/services/erp'
import { maskCnpj, maskCep, maskPhone, validateCnpj, fetchAddressByCep } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Save,
  Loader2,
  MapPin,
  UploadCloud,
  X,
  Image as ImageIcon,
  Download,
} from 'lucide-react'
import { getPbFileUrl, exportFullCompanyBackup } from '@/services/erp'

const UF_LIST = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

const RAMOS_LIST = [
  'Comércio',
  'Serviços',
  'Indústria',
  'Restaurante/Alimentação',
  'Tecnologia',
  'Construção',
  'Vestuário',
  'Outros',
]

export const CompanySettings: React.FC = () => {
  const { company, refreshCompany } = useAuth()
  const { toast } = useToast()

  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [foundationDate, setFoundationDate] = useState('')
  const [businessActivity, setBusinessActivity] = useState('')
  const [businessActivityOther, setBusinessActivityOther] = useState('')

  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)

  const [loading, setLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (company) {
      setLegalName(company.legal_name || '')
      setTradeName(company.trade_name || '')
      setCnpj(company.cnpj || '')
      setFoundationDate(company.foundation_date ? company.foundation_date.split('T')[0] : '')
      setBusinessActivity(company.business_activity || '')
      setBusinessActivityOther(company.business_activity_other || '')
      setZipCode(company.zip_code || '')
      setAddress(company.address || '')
      setNumber(company.number || '')
      setComplement(company.complement || '')
      setDistrict(company.district || '')
      setCity(company.city || '')
      setState(company.state || '')
      setPhone(company.phone || '')
      setContactEmail(company.contact_email || '')
      if (company.logo) {
        setLogoPreview(getPbFileUrl('companies', company.id, company.logo))
      } else {
        setLogoPreview(null)
      }
      setLogoFile(null)
      setRemoveLogo(false)
    }
  }, [company])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem PNG ou JPG.',
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Imagem muito grande',
        description: 'Tamanho máximo permitido: 5MB.',
      })
      return
    }
    setLogoFile(file)
    setRemoveLogo(false)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const handleExportBackup = async () => {
    if (!company) return
    try {
      setBackupLoading(true)
      const backupData = await exportFullCompanyBackup(company.id)
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchor = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      const sanitizedName = (company.trade_name || 'empresa')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `backup_${sanitizedName}_${dateStr}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      toast({
        title: 'Backup concluído com sucesso!',
        description: `Exportados ${backupData.metadata.total_records} registros em JSON estruturado.`,
      })
    } catch (err: any) {
      console.error('Erro ao gerar backup:', err)
      toast({
        variant: 'destructive',
        title: 'Erro no backup',
        description: err?.message || 'Não foi possível exportar os dados.',
      })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleCepBlur = async () => {
    const clean = zipCode.replace(/\D/g, '')
    if (clean.length === 8) {
      setCepLoading(true)
      const res = await fetchAddressByCep(clean)
      setCepLoading(false)
      if (res && !res.erro) {
        if (res.logradouro) setAddress(res.logradouro)
        if (res.bairro) setDistrict(res.bairro)
        if (res.localidade) setCity(res.localidade)
        if (res.uf && UF_LIST.includes(res.uf)) setState(res.uf)
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const newErrors: Record<string, string> = {}
    if (!legalName.trim()) newErrors.legalName = 'Razão Social obrigatória'
    if (!tradeName.trim()) newErrors.tradeName = 'Nome Fantasia obrigatório'
    if (!cnpj.trim() || !validateCnpj(cnpj)) newErrors.cnpj = 'CNPJ inválido'
    if (!foundationDate) newErrors.foundationDate = 'Data de Fundação obrigatória'
    if (!businessActivity) newErrors.businessActivity = 'Ramo de Atividade obrigatório'
    if (!address.trim()) newErrors.address = 'Endereço obrigatório'
    if (!number.trim()) newErrors.number = 'Número obrigatório'
    if (!district.trim()) newErrors.district = 'Bairro obrigatório'
    if (!city.trim()) newErrors.city = 'Cidade obrigatória'
    if (!state) newErrors.state = 'UF obrigatória'
    if (!phone.trim()) newErrors.phone = 'Telefone obrigatório'
    if (!contactEmail.trim()) newErrors.contactEmail = 'E-mail obrigatório'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('legal_name', legalName)
      formData.append('trade_name', tradeName)
      formData.append('cnpj', cnpj)
      formData.append('foundation_date', foundationDate)
      formData.append('business_activity', businessActivity)
      formData.append(
        'business_activity_other',
        businessActivity === 'Outros' ? businessActivityOther : '',
      )
      formData.append('zip_code', zipCode)
      formData.append('address', address)
      formData.append('number', number)
      formData.append('complement', complement)
      formData.append('district', district)
      formData.append('city', city)
      formData.append('state', state)
      formData.append('phone', phone)
      formData.append('contact_email', contactEmail)

      if (logoFile) {
        formData.append('logo', logoFile)
      } else if (removeLogo) {
        formData.append('logo', '')
      }

      await updateCompany(company.id, formData)

      await refreshCompany()
      toast({
        title: 'Alterações salvas!',
        description: 'Os dados cadastrais da empresa foram atualizados com sucesso.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível atualizar os dados.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Dados da Empresa
        </h2>
        <p className="text-sm text-slate-500">
          Gerencie e atualize os dados fiscais e cadastrais da sua empresa.
        </p>
      </div>

      {/* Bloco: Logo da Empresa */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-base">
            <ImageIcon className="w-5 h-5 text-emerald-600" /> Imagem / Logo da Empresa
          </div>
          <span className="text-[11px] text-slate-400">Exibido no topo, menu e relatórios PDF</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative shadow-inner">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo da Empresa"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="text-center p-2 text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-1 opacity-40 text-slate-500" />
                <span className="text-[10px] block font-medium">Sem logo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-xs text-slate-600">
              Envie o logotipo oficial da sua organização (PNG, JPG, SVG ou WEBP até 5MB). Ele
              substituirá o ícone padrão no cabeçalho do sistema e será impresso nos relatórios
              gerenciais e orçamentos compartilhados.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition active:scale-95 shadow-2xs">
                <UploadCloud className="w-4 h-4 text-emerald-700" />
                <span>{logoPreview ? 'Trocar Imagem' : 'Selecionar Imagem'}</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>

              {logoPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-9"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Remover Logo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco 1: Fiscal */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-semibold text-base">
            <Building2 className="w-5 h-5 text-emerald-600" /> Identificação Cadastral
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="legalName" className="text-xs font-semibold text-slate-700">
                Razão Social
              </Label>
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className={errors.legalName ? 'border-red-400' : ''}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tradeName" className="text-xs font-semibold text-slate-700">
                Nome Fantasia
              </Label>
              <Input
                id="tradeName"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className={errors.tradeName ? 'border-red-400' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                CNPJ
              </Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                className={errors.cnpj ? 'border-red-400' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="foundationDate" className="text-xs font-semibold text-slate-700">
                Data de Fundação
              </Label>
              <Input
                id="foundationDate"
                type="date"
                value={foundationDate}
                onChange={(e) => setFoundationDate(e.target.value)}
                className={errors.foundationDate ? 'border-red-400' : ''}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="businessActivity" className="text-xs font-semibold text-slate-700">
                Ramo de Atividade
              </Label>
              <Select value={businessActivity} onValueChange={(val) => setBusinessActivity(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ramo" />
                </SelectTrigger>
                <SelectContent>
                  {RAMOS_LIST.map((ramo) => (
                    <SelectItem key={ramo} value={ramo}>
                      {ramo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {businessActivity === 'Outros' && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="businessActivityOther"
                  className="text-xs font-semibold text-slate-700"
                >
                  Especifique o Ramo
                </Label>
                <Input
                  id="businessActivityOther"
                  value={businessActivityOther}
                  onChange={(e) => setBusinessActivityOther(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bloco 2: Contato e Endereço */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-semibold text-base">
            <MapPin className="w-5 h-5 text-emerald-600" /> Endereço e Contato
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="zipCode" className="text-xs font-semibold text-slate-700">
                CEP
              </Label>
              <div className="relative">
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(maskCep(e.target.value))}
                  onBlur={handleCepBlur}
                />
                {cepLoading && (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-3" />
                )}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
                Logradouro
              </Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="number" className="text-xs font-semibold text-slate-700">
                Número
              </Label>
              <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="complement" className="text-xs font-semibold text-slate-700">
                Complemento
              </Label>
              <Input
                id="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="district" className="text-xs font-semibold text-slate-700">
                Bairro
              </Label>
              <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-semibold text-slate-700">
                Cidade
              </Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-xs font-semibold text-slate-700">
                UF
              </Label>
              <Select value={state} onValueChange={(val) => setState(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UF_LIST.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                Telefone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contactEmail" className="text-xs font-semibold text-slate-700">
                E-mail de Contato
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm active:scale-95 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Bloco: Backup Completo & Exportação */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-base">
            <Download className="w-5 h-5 text-emerald-600" /> Backup Completo da Empresa
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
            Privativo & Seguro
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Exporte um arquivo <strong>JSON estruturado</strong> com todos os dados da sua empresa:
          cadastros, clientes, produtos e estoque (com links das fotos), vendas e itens detalhados,
          orçamentos, cotações de fornecedores, movimentações, receitas, despesas, contas a pagar e
          receber, metas e agenda. Apenas dados do seu próprio negócio são baixados.
        </p>

        <div className="flex justify-start pt-2">
          <Button
            type="button"
            onClick={handleExportBackup}
            disabled={backupLoading}
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold h-10 px-4 shadow-2xs"
          >
            {backupLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-600" /> Gerando arquivo
                de backup...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2 text-emerald-600" /> Exportar Backup Completo
                (.json)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CompanySettings
