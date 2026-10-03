import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Calculator,
  ReceiptText,
  CreditCard,
  History,
  Target,
  CalendarDays,
  FileSpreadsheet,
  Smartphone,
  CheckCircle2,
  Lightbulb,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { HELP_TOPICS, HELP_CATEGORIES, FAQ_LIST, HelpTopic } from '@/data/helpContent'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTopicId?: string | null
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  LayoutDashboard,
  Sparkles,
  ShoppingCart,
  Users,
  Package,
  Calculator,
  ReceiptText,
  CreditCard,
  History,
  Target,
  CalendarDays,
  FileSpreadsheet,
  Smartphone,
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onOpenChange, initialTopicId }) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId || null)
  const [activeTab, setActiveTab] = useState<'tutorial' | 'faq'>('tutorial')

  // Se initialTopicId mudar de fora, sincronizar
  React.useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId)
      setActiveTab('tutorial')
    }
  }, [initialTopicId])

  // Filtragem de tópicos por categoria e busca
  const filteredTopics = useMemo(() => {
    return HELP_TOPICS.filter((topic) => {
      const matchCategory = selectedCategory === 'todos' || topic.category === selectedCategory

      if (!searchQuery.trim()) {
        return matchCategory
      }

      const q = searchQuery.toLowerCase().trim()
      const inTitle = topic.title.toLowerCase().includes(q)
      const inShort = topic.shortDescription.toLowerCase().includes(q)
      const inKeywords = topic.keywords.some((k) => k.toLowerCase().includes(q))
      const inSteps = topic.steps.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.tip && s.tip.toLowerCase().includes(q)),
      )

      return (
        (inTitle || inShort || inKeywords || inSteps) &&
        (selectedCategory === 'todos' || matchCategory)
      )
    })
  }, [selectedCategory, searchQuery])

  // Filtragem do FAQ por busca
  const filteredFaq = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_LIST
    const q = searchQuery.toLowerCase().trim()
    return FAQ_LIST.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    )
  }, [searchQuery])

  // Tópico em foco na coluna de conteúdo (se houver)
  const selectedTopic = useMemo(() => {
    if (selectedTopicId) {
      const found = HELP_TOPICS.find((t) => t.id === selectedTopicId)
      if (found) return found
    }
    return filteredTopics[0] || HELP_TOPICS[0]
  }, [selectedTopicId, filteredTopics])

  const handleSelectTopic = (topic: HelpTopic) => {
    setSelectedTopicId(topic.id)
    setActiveTab('tutorial')
  }

  const handleNavigateToRoute = (route: string) => {
    onOpenChange(false)
    navigate(route)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[880px] max-h-[90vh] p-0 gap-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-2xl flex flex-col">
        {/* Header Elegante Esmeralda / Slate */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Central de Ajuda & Tutorial
                  <span className="hidden sm:inline-block text-[11px] font-medium bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Guia Oficial do Usuário
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Aprenda a operar todos os módulos, gráficos, métricas e fluxos do seu ERP.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Barra de Busca Rápida com Palavra-Chave */}
          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por módulo, funcionalidade ou dúvida (ex: markup, vendas, cnpj, saldo, pwa)..."
              className="w-full bg-slate-900/90 text-sm text-white placeholder-slate-400 pl-9 pr-9 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tabs: Tutorial Guiado vs Perguntas Frequentes */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800 text-xs">
            <button
              onClick={() => {
                setActiveTab('tutorial')
                setSelectedCategory('todos')
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'tutorial'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Manual dos Módulos ({HELP_TOPICS.length})
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'faq'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Perguntas Frequentes FAQ ({FAQ_LIST.length})
            </button>
          </div>
        </DialogHeader>

        {/* Content Body: Layout Duplo (Sidebar de Tópicos + Detalhe Operacional) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-slate-50 overflow-hidden">
          {activeTab === 'tutorial' ? (
            <>
              {/* Coluna Esquerda: Categorias & Lista de Tópicos */}
              <div className="w-full md:w-[320px] lg:w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
                {/* Filtro de Categorias (Chips) */}
                <div className="p-2.5 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-thin shrink-0 bg-slate-50/70">
                  {HELP_CATEGORIES.filter((c) => c.id !== 'faq').map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Lista de Tópicos */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                  {filteredTopics.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Nenhum módulo encontrado para a busca "{searchQuery}".
                    </div>
                  ) : (
                    filteredTopics.map((topic) => {
                      const IconComp = ICON_MAP[topic.iconName] || BookOpen
                      const isSelected = selectedTopic?.id === topic.id
                      return (
                        <div
                          key={topic.id}
                          onClick={() => handleSelectTopic(topic)}
                          className={`p-2.5 rounded-xl transition cursor-pointer text-left flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-emerald-50/90 border border-emerald-200 text-slate-900 shadow-2xs'
                              : 'hover:bg-slate-100/80 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{topic.title}</span>
                              {topic.badge && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider shrink-0 font-medium ${
                                    isSelected
                                      ? 'bg-emerald-200/80 text-emerald-800'
                                      : 'bg-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  {topic.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                              {topic.shortDescription}
                            </p>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 mt-2 shrink-0 transition-transform ${
                              isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-300'
                            }`}
                          />
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Coluna Direita: Detalhe do Tópico Selecionado */}
              <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
                {selectedTopic ? (
                  <div className="space-y-5 max-w-2xl">
                    {/* Cabeçalho do Tópico */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const TopIcon = ICON_MAP[selectedTopic.iconName] || BookOpen
                            return (
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <TopIcon className="w-5 h-5" />
                              </div>
                            )
                          })()}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {selectedTopic.categoryLabel}
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                              {selectedTopic.title}
                            </h3>
                          </div>
                        </div>

                        {selectedTopic.route && (
                          <Button
                            size="sm"
                            onClick={() => handleNavigateToRoute(selectedTopic.route!)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shrink-0 flex items-center gap-1.5 shadow-xs"
                          >
                            Ir para o Módulo
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {selectedTopic.shortDescription}
                      </p>

                      {/* Destaques / Pontos Fortes */}
                      {selectedTopic.highlights && selectedTopic.highlights.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 gap-1.5">
                          {selectedTopic.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Passo a Passo Operacional */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Passo a Passo de Operação
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {selectedTopic.steps.length} passos
                        </span>
                      </div>

                      <div className="space-y-3">
                        {selectedTopic.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 relative pl-4 sm:pl-5 overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                              {step.title}
                            </h5>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {step.description}
                            </p>
                            {step.tip && (
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 flex items-start gap-2 text-[11px] text-amber-900 mt-2">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="font-semibold">Dica prática: </strong>
                                  <span>{step.tip}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Selecione um tópico na lista ao lado para ver o tutorial detalhado.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Tab: Perguntas Frequentes (FAQ) com Accordion */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                    Perguntas Frequentes & Respostas Rápidas
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tire dúvidas comuns sobre redefinição de senhas, regras de negócio, relatórios e
                    uso no celular.
                  </p>
                </div>

                {filteredFaq.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                    Nenhuma pergunta encontrada com o termo "{searchQuery}".
                  </div>
                ) : (
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-2.5"
                    defaultValue={filteredFaq[0]?.id}
                  >
                    {filteredFaq.map((faq) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-1 shadow-2xs overflow-hidden"
                      >
                        <AccordionTrigger className="hover:no-underline py-3 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-left">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 w-fit">
                              {faq.category}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-900">
                              {faq.question}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-slate-600 leading-relaxed pt-1 pb-3 border-t border-slate-100">
                          <p>{faq.answer}</p>
                          {faq.relatedTopicId && (
                            <div className="mt-3 pt-2 flex items-center justify-end">
                              <button
                                onClick={() => {
                                  setSelectedTopicId(faq.relatedTopicId!)
                                  setActiveTab('tutorial')
                                }}
                                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                              >
                                Ver tutorial completo deste módulo
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Automação Empresarial • Precisa de suporte presencial? Contate o administrador.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-700 hover:bg-slate-100 h-8"
          >
            Fechar Ajuda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HelpModal
