import { useState } from 'react'
import { Gift, Copy, Check, Users, CalendarPlus } from 'lucide-react'
import { buildReferralLink, referralProgress } from '../services/profileService'

export default function ReferralSection({ profile }) {
  const [copied, setCopied] = useState(false)

  if (!profile) return null

  const link = buildReferralLink(profile)
  const { current, target } = referralProgress(profile)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-5 px-4 pb-24 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Indique e Ganhe</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          A cada 2 amigos indicados que assinarem, você ganha +30 dias grátis.
        </p>
      </div>

      {/* Card do link */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/20">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
          <Gift size={16} /> Seu link de convite
        </div>
        <p className="mt-2 break-all text-[13px] text-blue-50">{link}</p>

        <button
          onClick={handleCopy}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
            copied ? 'bg-white/20 text-white' : 'bg-white text-blue-700 active:scale-[0.98]'
          }`}
        >
          {copied ? (
            <>
              <Check size={16} /> Copiado!
            </>
          ) : (
            <>
              <Copy size={16} /> Copiar Meu Link de Convite
            </>
          )}
        </button>
      </div>

      {/* Progresso do próximo par */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Progresso para o próximo bônus</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${(current / target) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-blue-600">
            {current}/{target}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Faltam {target - current} indicado{target - current !== 1 ? 's' : ''} pagante
          {target - current !== 1 ? 's' : ''} para você ganhar +30 dias grátis.
        </p>
      </div>

      {/* Histórico */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Users size={16} />
            <span className="text-xs font-medium">Indicados pagantes</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {profile.paid_referrals_count ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <CalendarPlus size={16} />
            <span className="text-xs font-medium">Meses grátis ganhos</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {profile.months_earned_count ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
}
