import { useState } from 'react'
import {
  User,
  CalendarCheck,
  ShieldCheck,
  LogOut,
  Settings,
  Loader2,
  Save,
  Check,
  IdCard,
} from 'lucide-react'
import { signOut } from '../services/authService'
import { hasActiveSubscription, isAdmin, updateBrokerInfo, hasBrokerInfo } from '../services/profileService'

const CHECKOUT_URL =
  import.meta.env.VITE_CHECKOUT_URL || 'https://checkout.asaas.com/imobquick-mensal'

export default function ProfileScreen({ profile, onOpenAdmin, onProfileUpdated }) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [brokerName, setBrokerName] = useState(profile?.broker_name || '')
  const [brokerPhone, setBrokerPhone] = useState(profile?.broker_phone || '')
  const [creci, setCreci] = useState(profile?.creci || '')
  const [isSavingBroker, setIsSavingBroker] = useState(false)
  const [brokerSaved, setBrokerSaved] = useState(false)

  if (!profile) return null

  const active = hasActiveSubscription(profile)
  const admin = isAdmin(profile)
  const brokerInfoComplete = hasBrokerInfo(profile)

  const endsAtFormatted = profile.subscription_ends_at
    ? new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleSaveBrokerInfo(e) {
    e.preventDefault()
    setIsSavingBroker(true)
    setBrokerSaved(false)
    try {
      const updated = await updateBrokerInfo(profile.id, { brokerName, brokerPhone, creci })
      onProfileUpdated?.(updated)
      setBrokerSaved(true)
      setTimeout(() => setBrokerSaved(false), 2000)
    } catch (err) {
      alert('Erro ao salvar seus dados: ' + err.message)
    } finally {
      setIsSavingBroker(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 ' +
    'placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="space-y-5 px-4 pb-24 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Perfil</h1>
        <p className="mt-0.5 text-sm text-slate-500">{profile.email}</p>
      </div>

      {/* Avatar / identidade */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <User size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{profile.email}</p>
          <p className="text-xs text-slate-400">Código de indicação: {profile.referral_code}</p>
        </div>
      </div>

      {/* Dados do corretor: nome, WhatsApp e CRECI, preenchidos uma vez só */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <IdCard size={18} className="text-blue-600" />
          <p className="text-sm font-semibold text-slate-800">Meus dados de corretor</p>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Preencha uma vez. Esses dados aparecem automaticamente em todo anúncio gerado pela IA —
          você não precisa repetir a cada imóvel.
        </p>

        {!brokerInfoComplete && (
          <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            ⚠️ Preencha seu nome e CRECI para eles aparecerem nos seus anúncios.
          </div>
        )}

        <form onSubmit={handleSaveBrokerInfo} className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Nome completo</label>
            <input
              className={inputClass}
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              placeholder="Ex: Ana Silva"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              WhatsApp / Telefone
            </label>
            <input
              className={inputClass}
              value={brokerPhone}
              onChange={(e) => setBrokerPhone(e.target.value)}
              placeholder="Ex: (81) 99999-9999"
              inputMode="tel"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">CRECI</label>
            <input
              className={inputClass}
              value={creci}
              onChange={(e) => setCreci(e.target.value)}
              placeholder="Ex: 21648"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingBroker}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
              brokerSaved
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-[0.98]'
            } disabled:opacity-60`}
          >
            {isSavingBroker ? (
              <Loader2 size={16} className="animate-spin" />
            ) : brokerSaved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {brokerSaved ? 'Salvo!' : 'Salvar meus dados'}
          </button>
        </form>
      </div>

      {/* Status da assinatura */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className={active ? 'text-green-600' : 'text-red-500'} />
            <p className="text-sm font-semibold text-slate-800">Status da assinatura</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {active ? 'Ativa' : 'Inativa'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {active ? 'Válida até' : 'Expirou em'} <strong>{endsAtFormatted}</strong>
        </p>

        {!active && (
          <a
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3
                       text-sm font-semibold text-white shadow-lg shadow-blue-600/30"
          >
            Assinar por R$ 39,90/mês
          </a>
        )}
      </div>

      {/* Acesso ao painel admin */}
      {admin && (
        <button
          onClick={onOpenAdmin}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-100
                     bg-white p-4 shadow-sm active:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">⚙️ Painel Admin</span>
          </div>
          <Settings size={16} className="text-slate-400" />
        </button>
      )}

      {/* Sair */}
      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100
                   bg-red-50 py-3.5 text-sm font-semibold text-red-600 active:bg-red-100"
      >
        {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
        Sair da conta
      </button>
    </div>
  )
}
