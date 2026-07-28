import { ShieldAlert, Smartphone, LogOut } from 'lucide-react'
import { signOut } from '../services/authService'
import { getDeviceLabel } from '../services/deviceService'

const STATUS_TEXT = {
  blocked: {
    title: 'Novo dispositivo detectado',
    description:
      'Sua conta já está em uso no limite de 2 dispositivos. Peça para o administrador liberar o acesso deste aparelho, ou continue usando o app em um dos dispositivos já aprovados.',
  },
  rejected: {
    title: 'Acesso não autorizado',
    description:
      'O administrador não autorizou o acesso deste dispositivo à sua conta. Entre em contato com o suporte se acredita que isso é um engano.',
  },
  revoked: {
    title: 'Dispositivo removido',
    description:
      'Este dispositivo foi substituído por outro mais recente no limite de 2 aparelhos por conta. Peça para o administrador reativá-lo, se necessário.',
  },
}

export default function DeviceBlockedScreen({ status }) {
  const info = STATUS_TEXT[status] ?? STATUS_TEXT.blocked

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0f172a] px-6 py-10">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
          <ShieldAlert size={28} />
        </div>

        <h1 className="text-xl font-bold text-white">{info.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{info.description}</p>

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Este dispositivo</p>
            <p className="truncate text-sm font-semibold text-slate-700">{getDeviceLabel()}</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Cada assinatura do ImobFlash pode ser usada em até <strong className="text-slate-300">2 dispositivos</strong>.
          Isso protege sua conta e impede o uso compartilhado indevido.
        </p>

        <button
          onClick={() => signOut()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10
                     bg-white/5 py-3 text-sm font-medium text-slate-300 active:bg-white/10"
        >
          <LogOut size={16} />
          Sair e tentar com outra conta
        </button>
      </div>
    </div>
  )
}
