import { PlusCircle, Home, Gift, User } from 'lucide-react'

export default function BottomNav({ activeTab, onChangeTab }) {
  const tabs = [
    { id: 'new', label: 'Novo Imóvel', icon: PlusCircle },
    { id: 'list', label: 'Meus Imóveis', icon: Home },
    { id: 'referral', label: 'Indique e Ganhe', icon: Gift },
    { id: 'profile', label: 'Perfil', icon: User },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onChangeTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
