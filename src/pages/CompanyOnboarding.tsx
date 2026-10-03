import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { createCompany } from '@/services/erp'
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

export const CompanyOnboarding: React.FC = () => {
  const { user, refreshCompany } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [successComplete, setSuccessComplete] = useState(false)

  // Etapa 1
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [foundationDate, setFoundationDate] = useState('')
  const [businessActivity, setBusinessActivity] = useState('')
  const [businessActivityOther, setBusinessActivityOther] = useState('')

  // Etapa 2
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email || '')

  // Logo da empresa
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cepLoading, setCepLoading] = useState(false)

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
        description: 'Máximo permitido: 5MB.',
      })
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Tratamento de CEP
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

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!legalName.trim()) newErrors.legalName = 'Razão Social é obrigatória'
    if (!tradeName.trim()) newErrors.tradeName = 'Nome Fantasia é obrigatório'
    if (!cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório'
    } else if (!validateCnpj(cnpj)) {
      newErrors.cnpj = 'CNPJ inválido (verifique os dígitos verificadores)'
    }
    if (!foundationDate) newErrors.foundationDate = 'Data de Fundação é obrigatória'
    if (!businessActivity) newErrors.businessActivity = 'Selecione o ramo de atividade'
    if (businessActivity === 'Outros' && !businessActivityOther.trim()) {
      newErrors.businessActivityOther = 'Especifique o ramo de atividade'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    if (!zipCode.trim() || zipCode.replace(/\D/g, '').length !== 8) {
      newErrors.zipCode = 'CEP válido é obrigatório'
    }
    if (!address.trim()) newErrors.address = 'Logradouro é obrigatório'
    if (!number.trim()) newErrors.number = 'Número é obrigatório'
    if (!district.trim()) newErrors.district = 'Bairro é obrigatório'
    if (!city.trim()) newErrors.city = 'Cidade é obrigatória'
    if (!state) newErrors.state = 'Selecione o Estado (UF)'
    if (!phone.trim()) newErrors.phone = 'Telefone é obrigatório'
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      newErrors.contactEmail = 'E-mail de contato válido é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return
    if (!user) return

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('user_id', user.id)
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
      }

      await createCompany(formData)

      await refreshCompany()
      setSuccessComplete(true)
      toast({
        title: 'Empresa cadastrada!',
        description: 'Tudo pronto. Bem-vindo à Automação Empresarial!',
      })

      setTimeout(() => {
        navigate('/dashboard')
      }, 1800)
    } catch (err: any) {
      console.error('Falha ao registrar empresa:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar empresa',
        description: err?.message || 'Verifique se o CNPJ já não está cadastrado.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left progress panel */}
      <div className="hidden lg:flex lg:w-80 bg-[#0F172A] p-8 text-white flex-col justify-between border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-100 text-sm tracking-tight">
              Automação Empresarial
            </span>
          </div>

          <div className="space-y-2 mb-8">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Primeiro Acesso
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Cadastro da Empresa</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Para desbloquear as ferramentas financeiras e operacionais, configure os dados fiscais
              e de contato da sua organização.
            </p>
          </div>

          {/* Stepper vertical */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 1
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : 'bg-emerald-800 text-emerald-200'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${step === 1 ? 'text-white' : 'text-slate-300'}`}
                >
                  Dados da Empresa
                </p>
                <p className="text-xs text-slate-500">Razão Social, CNPJ e Ramo</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 2
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                2
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${step === 2 ? 'text-white' : 'text-slate-500'}`}
                >
                  Contato e Endereço
                </p>
                <p className="text-xs text-slate-500">Localização e canais de contato</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">Etapa {step} de 2</div>
      </div>

      {/* Right Form Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-10">
        <div className="w-full max-w-2xl bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
          {successComplete ? (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Cadastro Concluído com Sucesso!</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Sua empresa <strong>{tradeName}</strong> foi configurada. Estamos carregando seu
                painel de controle...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            </div>
          ) : step === 1 ? (
            /* ETAPA 1 */
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Building2 className="w-4 h-4" /> Etapa 1 de 2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Dados da Empresa
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Estas informações serão usadas em seus documentos e relatórios gerenciais.
                </p>
              </div>

              {/* Upload de Logo no Onboarding */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block">
                    Logo / Imagem da Empresa (Opcional)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    PNG ou JPG até 5MB. Poderá ser alterado a qualquer momento.
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label className="cursor-pointer text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 inline-flex items-center gap-1 transition">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{logoPreview ? 'Alterar Logo' : 'Enviar Logo'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null)
                          setLogoPreview(null)
                        }}
                        className="text-xs text-red-600 hover:text-red-700 p-1"
                        title="Remover"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="legalName" className="text-xs font-semibold text-slate-700">
                    Razão Social <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="legalName"
                    placeholder="Ex: Auto Comercial Ltda"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className={`h-10 ${errors.legalName ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.legalName && <p className="text-xs text-red-600">{errors.legalName}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tradeName" className="text-xs font-semibold text-slate-700">
                    Nome Fantasia <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tradeName"
                    placeholder="Ex: Comercial Auto"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className={`h-10 ${errors.tradeName ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.tradeName && <p className="text-xs text-red-600">{errors.tradeName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                    CNPJ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                    className={`h-10 ${errors.cnpj ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="foundationDate" className="text-xs font-semibold text-slate-700">
                    Data de Fundação <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="foundationDate"
                    type="date"
                    value={foundationDate}
                    onChange={(e) => setFoundationDate(e.target.value)}
                    className={`h-10 ${errors.foundationDate ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.foundationDate && (
                    <p className="text-xs text-red-600">{errors.foundationDate}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    htmlFor="businessActivity"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Ramo de Atividade <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={businessActivity}
                    onValueChange={(val) => setBusinessActivity(val)}
                  >
                    <SelectTrigger
                      className={`h-10 ${errors.businessActivity ? 'border-red-400 bg-red-50/50' : ''}`}
                    >
                      <SelectValue placeholder="Selecione o segmento principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {RAMOS_LIST.map((ramo) => (
                        <SelectItem key={ramo} value={ramo}>
                          {ramo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.businessActivity && (
                    <p className="text-xs text-red-600">{errors.businessActivity}</p>
                  )}
                </div>

                {businessActivity === 'Outros' && (
                  <div className="space-y-1.5 sm:col-span-2 animate-fade-in">
                    <Label
                      htmlFor="businessActivityOther"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Especifique o Ramo de Atividade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessActivityOther"
                      placeholder="Ex: Consultoria em Logística"
                      value={businessActivityOther}
                      onChange={(e) => setBusinessActivityOther(e.target.value)}
                      className={`h-10 ${errors.businessActivityOther ? 'border-red-400 bg-red-50/50' : ''}`}
                    />
                    {errors.businessActivityOther && (
                      <p className="text-xs text-red-600">{errors.businessActivityOther}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm flex items-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          ) : (
            /* ETAPA 2 */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-1">
                  <MapPin className="w-4 h-4" /> Etapa 2 de 2
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Contato e Endereço
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Informe o endereço da sede e canais de contato da organização.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="zipCode" className="text-xs font-semibold text-slate-700">
                    CEP <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      value={zipCode}
                      onChange={(e) => setZipCode(maskCep(e.target.value))}
                      onBlur={handleCepBlur}
                      className={`h-10 ${errors.zipCode ? 'border-red-400 bg-red-50/50' : ''}`}
                    />
                    {cepLoading && (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-3" />
                    )}
                  </div>
                  {errors.zipCode && <p className="text-xs text-red-600">{errors.zipCode}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
                    Logradouro / Endereço <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="Rua, Avenida, Alameda..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`h-10 ${errors.address ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="number" className="text-xs font-semibold text-slate-700">
                    Número <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="number"
                    placeholder="123"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className={`h-10 ${errors.number ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.number && <p className="text-xs text-red-600">{errors.number}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="complement" className="text-xs font-semibold text-slate-700">
                    Complemento
                  </Label>
                  <Input
                    id="complement"
                    placeholder="Sala 101, Galpão B..."
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="district" className="text-xs font-semibold text-slate-700">
                    Bairro <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="district"
                    placeholder="Bairro"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={`h-10 ${errors.district ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.district && <p className="text-xs text-red-600">{errors.district}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold text-slate-700">
                    Cidade <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`h-10 ${errors.city ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold text-slate-700">
                    UF <span className="text-red-500">*</span>
                  </Label>
                  <Select value={state} onValueChange={(val) => setState(val)}>
                    <SelectTrigger
                      className={`h-10 ${errors.state ? 'border-red-400 bg-red-50/50' : ''}`}
                    >
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
                  {errors.state && <p className="text-xs text-red-600">{errors.state}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Telefone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    className={`h-10 ${errors.phone ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="contactEmail" className="text-xs font-semibold text-slate-700">
                    E-mail de Contato <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={`h-10 ${errors.contactEmail ? 'border-red-400 bg-red-50/50' : ''}`}
                  />
                  {errors.contactEmail && (
                    <p className="text-xs text-red-600">{errors.contactEmail}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
                </Button>

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
                      <Sparkles className="w-4 h-4 mr-2" /> Concluir Cadastro
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompanyOnboarding
