import { Lock, Sparkles, Camera, MessageCircle, Gift } from 'lucide-react'
import { signOut } from '../services/authService'

const CHECKOUT_URL =
  import.meta.env.VITE_CHECKOUT_URL || 'https://checkout.asaas.com/imobquick-mensal'
const SUBSCRIPTION_PRICE = import.meta.env.VITE_SUBSCRIPTION_PRICE || '39,90'

const BENEFITS = [
  { icon: Sparkles, text: 'Textos de divulgação gerados por IA em segundos' },
  { icon: Camera, text: 'Upload e compressão automática das fotos do imóvel' },
  { icon: MessageCircle, text: 'Mensagens prontas para Instagram, portais e WhatsApp' },
  { icon: Gift, text: 'Indique corretores amigos e ganhe meses grátis' },
]

export default function SubscriptionGate({ profile }) {
  const expired =
    profile?.subscription_ends_at && new Date(profile.subscription_ends_at) < new Date()

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0f172a] px-6 py-10">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <Lock size={28} />
        </div>

        <h1 className="text-xl font-bold text-white">
          {expired ? 'Sua assinatura expirou' : 'Assinatura inativa'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Assine o ImobFlash para continuar cadastrando imóveis e gerando textos com IA.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl bg-white p-5 text-left shadow-xl">
          {BENEFITS.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={16} />
              </div>
              <p className="text-sm text-slate-700">{text}</p>
            </div>
          ))}

          <a
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4
                       text-[15px] font-semibold text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98]"
          >
            Assinar por R$ {SUBSCRIPTION_PRICE}/mês
          </a>
        </div>

        <button
          onClick={() => signOut()}
          className="mt-6 text-sm font-medium text-slate-400 underline underline-offset-2"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
