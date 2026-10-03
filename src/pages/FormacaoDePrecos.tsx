import React, { useState, useEffect, useMemo } from 'react'
import {
  Calculator,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Percent,
  Sparkles,
  Info,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getProducts, updateProduct } from '@/services/erp'
import type { Product } from '@/types/erp'
import { formatCurrency } from '@/lib/formatters'
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

export const FormacaoDePrecos: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  // Parâmetros da Calculadora
  const [costPrice, setCostPrice] = useState<string>('100')
  const [taxPercent, setTaxPercent] = useState<string>('8') // Impostos (%)
  const [variableExpensesPercent, setVariableExpensesPercent] = useState<string>('12') // Despesas Variáveis / Comissões (%)
  const [desiredProfitPercent, setDesiredProfitPercent] = useState<string>('25') // Margem de Lucro (%)

  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!company) return
    getProducts(company.id).then((data) => {
      setProducts(data)
      if (data.length > 0) {
        setSelectedProductId(data[0].id)
        setCostPrice(data[0].cost_price.toString())
      }
    })
  }, [company])

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId)
    const prod = products.find((p) => p.id === prodId)
    if (prod) {
      setCostPrice(prod.cost_price.toString())
    }
  }

  // Cálculo de Markup Divisor
  // Markup Divisor = 100 / (100 - (Impostos + Despesas + Lucro))
  // Preço Sugerido = Custo * Markup Divisor
  const calculation = useMemo(() => {
    const custo = parseFloat(costPrice.replace(',', '.')) || 0
    const impostos = parseFloat(taxPercent.replace(',', '.')) || 0
    const despesas = parseFloat(variableExpensesPercent.replace(',', '.')) || 0
    const margem = parseFloat(desiredProfitPercent.replace(',', '.')) || 0

    const totalPercents = impostos + despesas + margem

    if (totalPercents >= 100) {
      return {
        invalid: true,
        markupDivisor: 0,
        suggestedPrice: 0,
        custoVal: custo,
        impostosVal: 0,
        despesasVal: 0,
        lucroVal: 0,
      }
    }

    const divisor = (100 - totalPercents) / 100
    const precoSugerido = divisor > 0 ? custo / divisor : custo
    const impostosR = (precoSugerido * impostos) / 100
    const despesasR = (precoSugerido * despesas) / 100
    const lucroR = precoSugerido - (custo + impostosR + despesasR)

    return {
      invalid: false,
      markupDivisor: 100 / (100 - totalPercents),
      suggestedPrice: precoSugerido,
      custoVal: custo,
      impostosVal: impostosR,
      despesasVal: despesasR,
      lucroVal: lucroR,
      impostosPct: impostos,
      despesasPct: despesas,
      lucroPct: margem,
    }
  }, [costPrice, taxPercent, variableExpensesPercent, desiredProfitPercent])

  const handleApplyToProduct = async () => {
    if (!selectedProductId || calculation.invalid) return
    try {
      setApplying(true)
      const roundedPrice = Math.round(calculation.suggestedPrice * 100) / 100
      await updateProduct(selectedProductId, {
        cost_price: calculation.custoVal,
        selling_price: roundedPrice,
      })

      // Atualiza lista local
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProductId
            ? { ...p, cost_price: calculation.custoVal, selling_price: roundedPrice }
            : p,
        ),
      )

      toast({
        title: 'Preço de venda atualizado!',
        description: `O produto foi atualizado para ${formatCurrency(roundedPrice)}.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aplicar preço',
        description: err?.message,
      })
    } finally {
      setApplying(false)
    }
  }

  const handleReset = () => {
    setCostPrice('100')
    setTaxPercent('8')
    setVariableExpensesPercent('12')
    setDesiredProfitPercent('25')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Formação de Preços & Markup
        </h2>
        <p className="text-sm text-slate-500">
          Calcule o preço de venda ideal baseado em custos, impostos, despesas e margem desejada.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-8">
        {/* Seleção do Produto & Custo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Vincular a Produto do Estoque
            </Label>
            <Select value={selectedProductId} onValueChange={handleProductSelect}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Selecione um produto cadastrado" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} (Atual: {formatCurrency(p.selling_price)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cost" className="text-xs font-semibold text-slate-700">
              Preço de Custo Direto (R$) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <Input
                id="cost"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="pl-9 h-10 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Variáveis Percentuais */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Deduções e Margem Alvo (% sobre a Venda)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <Label htmlFor="tax" className="text-xs font-semibold text-slate-700">
                Impostos sobre a Venda (%)
              </Label>
              <div className="relative">
                <Input
                  id="tax"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  className="pr-7 h-9 text-xs font-mono bg-white"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-400">Simples, ICMS, PIS/COFINS</p>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <Label htmlFor="expenses" className="text-xs font-semibold text-slate-700">
                Despesas Variáveis (%)
              </Label>
              <div className="relative">
                <Input
                  id="expenses"
                  value={variableExpensesPercent}
                  onChange={(e) => setVariableExpensesPercent(e.target.value)}
                  className="pr-7 h-9 text-xs font-mono bg-white"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-400">Comissões, taxa de cartão, frete</p>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <Label htmlFor="profit" className="text-xs font-semibold text-slate-700">
                Margem de Lucro Alvo (%)
              </Label>
              <div className="relative">
                <Input
                  id="profit"
                  value={desiredProfitPercent}
                  onChange={(e) => setDesiredProfitPercent(e.target.value)}
                  className="pr-7 h-9 text-xs font-mono bg-white"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-400">Lucro líquido pretendido</p>
            </div>
          </div>
        </div>

        {/* Resultado Principal Destacado */}
        {calculation.invalid ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs">
            A soma de Impostos + Despesas + Margem de Lucro deve ser menor que 100%.
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Preço de Venda Sugerido (Markup Divisor)
                </span>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-400 mt-1">
                  {formatCurrency(calculation.suggestedPrice)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Markup multiplicador equivalente:{' '}
                  <strong className="text-white">
                    {(calculation.markupDivisor || 1).toFixed(3)}x
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-10"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Limpar
                </Button>

                <Button
                  onClick={handleApplyToProduct}
                  disabled={!selectedProductId || applying}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-10 px-5 shadow-sm active:scale-95 transition"
                >
                  <Sparkles className="w-4 h-4 mr-1.5 text-slate-950" />
                  {applying ? 'Aplicando...' : 'Aplicar ao Produto'}
                </Button>
              </div>
            </div>

            {/* Painel de Decomposição (Breakdown) */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Decomposição Financeira da Venda
              </h5>

              {/* Barra segmentada */}
              <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (calculation.custoVal / (calculation.suggestedPrice || 1)) * 100,
                    )}%`,
                  }}
                  className="bg-slate-400"
                  title="Custo"
                />
                <div
                  style={{ width: `${calculation.impostosPct}%` }}
                  className="bg-red-500"
                  title="Impostos"
                />
                <div
                  style={{ width: `${calculation.despesasPct}%` }}
                  className="bg-amber-500"
                  title="Despesas Variáveis"
                />
                <div
                  style={{ width: `${calculation.lucroPct}%` }}
                  className="bg-emerald-500"
                  title="Lucro"
                />
              </div>

              {/* Valores em R$ e % */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Custo Direto</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(calculation.custoVal)}
                  </span>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-red-400 block text-[11px]">
                    Impostos ({calculation.impostosPct}%)
                  </span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(calculation.impostosVal)}
                  </span>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-amber-400 block text-[11px]">
                    Despesas ({calculation.despesasPct}%)
                  </span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(calculation.despesasVal)}
                  </span>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-emerald-400 block text-[11px]">
                    Lucro Líquido ({calculation.lucroPct}%)
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {formatCurrency(calculation.lucroVal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FormacaoDePrecos
