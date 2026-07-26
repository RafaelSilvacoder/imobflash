import { useEffect, useState } from 'react'
import { ArrowLeft, Search, Gift, Infinity as InfinityIcon, Loader2, ShieldCheck, Smartphone } from 'lucide-react'
import { listAllProfiles, grantFreeDays, grantUnlimitedDemo, hasActiveSubscription } from '../services/profileService'
import DeviceApprovalList from './DeviceApprovalList'

export default function AdminPanel({ onBack }) {
  const [section, setSection] = useState('profiles') // 'profiles' | 'devices'
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles(emailFilter) {
    setIsLoading(true)
    try {
      const data = await listAllProfiles(emailFilter)
      setProfiles(data)
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar perfis: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    loadProfiles(search)
  }

  async function handleGrant7Days(profile) {
    setBusyId(profile.id)
    try {
      await grantFreeDays(profile.id, 7)
      await loadProfiles(search)
    } catch (err) {
      alert('Erro ao conceder dias grátis: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleUnlimitedDemo(profile) {
    if (!confirm(`Ativar demonstração ilimitada para ${profile.email}?`)) return
    setBusyId(profile.id)
    try {
      await grantUnlimitedDemo(profile.id)
      await loadProfiles(search)
    } catch (err) {
      alert('Erro ao ativar demonstração: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-[15px] text-slate-800 ' +
    'placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-[#0f172a] px-4 py-4">
        <button onClick={onBack} className="rounded-full bg-white/10 p-2 text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-400" />
          <span className="text-lg font-bold text-white">Painel Admin</span>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {/* Abas internas */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setSection('profiles')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              section === 'profiles' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'
            }`}
          >
            <ShieldCheck size={14} /> Perfis
          </button>
          <button
            onClick={() => setSection('devices')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              section === 'devices' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'
            }`}
          >
            <Smartphone size={14} /> Dispositivos
          </button>
        </div>

        {section === 'devices' && <DeviceApprovalList />}

        {section === 'profiles' && (
          <>
            {/* Busca */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={inputClass}
                placeholder="Buscar por e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            {isLoading && (
              <div className="flex justify-center py-16 text-slate-400">
                <Loader2 size={26} className="animate-spin" />
              </div>
            )}

            {!isLoading && profiles.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">Nenhum perfil encontrado.</p>
            )}

            {/* Lista de perfis */}
            <div className="space-y-3">
              {profiles.map((profile) => {
                const active = hasActiveSubscription(profile)
                const busy = busyId === profile.id
                return (
                  <div key={profile.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{profile.email}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {profile.role === 'admin' ? '👑 Admin' : 'Corretor'} · código{' '}
                          {profile.referral_code}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Expira em:{' '}
                      {profile.subscription_ends_at
                        ? new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR')
                        : '—'}{' '}
                      · Indicados pagos: {profile.paid_referrals_count ?? 0}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGrant7Days(profile)}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2.5
                                   text-xs font-semibold text-blue-700 active:bg-blue-100 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                        Conceder 7 Dias
                      </button>
                      <button
                        onClick={() => handleUnlimitedDemo(profile)}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5
                                   text-xs font-semibold text-slate-700 active:bg-slate-200 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <InfinityIcon size={14} />}
                        Ativação Manual
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
