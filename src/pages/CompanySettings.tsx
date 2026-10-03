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
import { Building2, Save, Loader2, MapPin } from 'lucide-react'

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

  const [loading, setLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
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
    }
  }, [company])

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
      await updateCompany(company.id, {
        legal_name: legalName,
        trade_name: tradeName,
        cnpj,
        foundation_date: foundationDate,
        business_activity: businessActivity,
        business_activity_other: businessActivity === 'Outros' ? businessActivityOther : '',
        zip_code: zipCode,
        address,
        number,
        complement,
        district,
        city,
        state,
        phone,
        contact_email: contactEmail,
      })

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
    </div>
  )
}

export default CompanySettings
