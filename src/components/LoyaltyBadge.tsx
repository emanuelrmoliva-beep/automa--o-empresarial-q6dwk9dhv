import React from 'react'
import { Trophy, Medal, Award, Crown, Star, Shield, Gem, Sparkles } from 'lucide-react'
import type { LoyaltyBadgeIcon, LoyaltyBadgeColor, LoyaltyTier } from '@/types/erp'
import { cn } from '@/lib/utils'

interface LoyaltyBadgeProps {
  tier?: LoyaltyTier | null
  tierName?: string
  icon?: LoyaltyBadgeIcon
  color?: LoyaltyBadgeColor
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showBenefits?: boolean
  className?: string
  interactive?: boolean
  onClick?: () => void
}

// Mapeamento dos ícones Lucide
export const LOYALTY_ICON_MAP: Record<
  LoyaltyBadgeIcon,
  React.ComponentType<{ className?: string }>
> = {
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  star: Star,
  shield: Shield,
  gem: Gem,
}

// Configurações visuais por cor de faixa
export const LOYALTY_COLOR_CONFIG: Record<
  LoyaltyBadgeColor,
  {
    bgBadge: string
    borderBadge: string
    textBadge: string
    iconColor: string
    glowColor: string
    gradientBg: string
    badgeClass: string
  }
> = {
  amber: {
    bgBadge: 'bg-amber-50',
    borderBadge: 'border-amber-300',
    textBadge: 'text-amber-900',
    iconColor: 'text-amber-700',
    glowColor: 'shadow-amber-500/20',
    gradientBg: 'from-amber-600 via-amber-500 to-amber-700',
    badgeClass: 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-900 border-amber-300/80',
  },
  slate: {
    bgBadge: 'bg-slate-100',
    borderBadge: 'border-slate-300',
    textBadge: 'text-slate-800',
    iconColor: 'text-slate-600',
    glowColor: 'shadow-slate-400/20',
    gradientBg: 'from-slate-400 via-slate-300 to-slate-500',
    badgeClass: 'bg-gradient-to-r from-slate-200 to-slate-100 text-slate-800 border-slate-300',
  },
  yellow: {
    bgBadge: 'bg-yellow-50',
    borderBadge: 'border-yellow-400',
    textBadge: 'text-yellow-900',
    iconColor: 'text-yellow-600',
    glowColor: 'shadow-yellow-500/30',
    gradientBg: 'from-yellow-400 via-amber-400 to-yellow-500',
    badgeClass: 'bg-gradient-to-r from-yellow-200 to-amber-100 text-yellow-950 border-yellow-400',
  },
  cyan: {
    bgBadge: 'bg-cyan-50',
    borderBadge: 'border-cyan-300',
    textBadge: 'text-cyan-950',
    iconColor: 'text-cyan-600',
    glowColor: 'shadow-cyan-400/30',
    gradientBg: 'from-cyan-400 via-teal-300 to-blue-500',
    badgeClass: 'bg-gradient-to-r from-cyan-100 to-teal-50 text-cyan-900 border-cyan-300',
  },
  emerald: {
    bgBadge: 'bg-emerald-50',
    borderBadge: 'border-emerald-300',
    textBadge: 'text-emerald-950',
    iconColor: 'text-emerald-600',
    glowColor: 'shadow-emerald-500/20',
    gradientBg: 'from-emerald-500 via-teal-400 to-emerald-600',
    badgeClass: 'bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-900 border-emerald-300',
  },
  violet: {
    bgBadge: 'bg-violet-50',
    borderBadge: 'border-violet-300',
    textBadge: 'text-violet-950',
    iconColor: 'text-violet-600',
    glowColor: 'shadow-violet-500/20',
    gradientBg: 'from-violet-500 via-purple-400 to-violet-600',
    badgeClass: 'bg-gradient-to-r from-violet-100 to-purple-50 text-violet-900 border-violet-300',
  },
  rose: {
    bgBadge: 'bg-rose-50',
    borderBadge: 'border-rose-300',
    textBadge: 'text-rose-950',
    iconColor: 'text-rose-600',
    glowColor: 'shadow-rose-500/20',
    gradientBg: 'from-rose-500 via-pink-400 to-rose-600',
    badgeClass: 'bg-gradient-to-r from-rose-100 to-pink-50 text-rose-900 border-rose-300',
  },
  blue: {
    bgBadge: 'bg-blue-50',
    borderBadge: 'border-blue-300',
    textBadge: 'text-blue-950',
    iconColor: 'text-blue-600',
    glowColor: 'shadow-blue-500/20',
    gradientBg: 'from-blue-500 via-sky-400 to-blue-600',
    badgeClass: 'bg-gradient-to-r from-blue-100 to-sky-50 text-blue-900 border-blue-300',
  },
}

export const LoyaltyBadge: React.FC<LoyaltyBadgeProps> = ({
  tier,
  tierName,
  icon,
  color,
  size = 'sm',
  showLabel = true,
  showBenefits = false,
  className,
  interactive = false,
  onClick,
}) => {
  const resolvedName = tier?.name || tierName || 'Sem Faixa'
  const resolvedIconKey = tier?.badge_icon || icon || 'medal'
  const resolvedColorKey = tier?.badge_color || color || 'slate'

  const IconComponent = LOYALTY_ICON_MAP[resolvedIconKey] || Medal
  const colorConfig = LOYALTY_COLOR_CONFIG[resolvedColorKey] || LOYALTY_COLOR_CONFIG.slate

  const sizeStyles = {
    xs: {
      container: 'px-1.5 py-0.5 text-[10px] gap-1',
      icon: 'w-3 h-3',
    },
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1.5',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      container: 'px-2.5 py-1 text-xs gap-1.5 font-semibold',
      icon: 'w-4 h-4',
    },
    lg: {
      container: 'px-3.5 py-1.5 text-sm gap-2 font-bold shadow-sm',
      icon: 'w-5 h-5',
    },
  }[size]

  return (
    <span
      onClick={onClick}
      title={
        tier?.benefits
          ? `${resolvedName} - Benefícios: ${tier.benefits}`
          : `${resolvedName} (Programa de Fidelidade)`
      }
      className={cn(
        'inline-flex items-center rounded-full border font-semibold select-none transition-all duration-150',
        colorConfig.badgeClass,
        sizeStyles.container,
        interactive && 'cursor-pointer hover:brightness-95 hover:shadow-xs active:scale-95',
        className,
      )}
    >
      <IconComponent className={cn(sizeStyles.icon, colorConfig.iconColor, 'shrink-0')} />
      {showLabel && <span className="truncate">{resolvedName}</span>}
      {showBenefits && tier?.discount_percent ? (
        <span className="text-[10px] bg-white/70 px-1 py-0.2 rounded-full font-bold ml-0.5">
          {tier.discount_percent}% OFF
        </span>
      ) : null}
    </span>
  )
}

export default LoyaltyBadge
