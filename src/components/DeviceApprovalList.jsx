import { useEffect, useState } from 'react'
import { Smartphone, Check, X, Loader2, ShieldAlert } from 'lucide-react'
import { listDevices, approveDevice, rejectDevice } from '../services/deviceService'

const STATUS_LABEL = {
  blocked: { text: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  rejected: { text: 'Rejeitado', className: 'bg-red-100 text-red-600' },
  revoked: { text: 'Revogado', className: 'bg-slate-100 text-slate-500' },
  approved: { text: 'Aprovado', className: 'bg-green-100 text-green-700' },
}

export default function DeviceApprovalList() {
  const [devices, setDevices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setIsLoading(true)
    try {
      const data = await listDevices({ onlyPending: true })
      setDevices(data)
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar dispositivos: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove(device) {
    setBusyId(device.id)
    try {
      await approveDevice(device.id)
      await load()
    } catch (err) {
      alert('Erro ao aprovar dispositivo: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(device) {
    setBusyId(device.id)
    try {
      await rejectDevice(device.id)
      await load()
    } catch (err) {
      alert('Erro ao rejeitar dispositivo: ' + err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 size={26} className="animate-spin" />
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-400">
        <ShieldAlert size={26} />
        <p className="text-sm">Nenhuma solicitação de dispositivo pendente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Cada conta permite 2 dispositivos aprovados automaticamente. Solicitações abaixo são de um
        3º dispositivo (ou mais) tentando acessar a mesma conta.
      </p>

      {devices.map((device) => {
        const busy = busyId === device.id
        const statusInfo = STATUS_LABEL[device.status] ?? STATUS_LABEL.blocked

        return (
          <div key={device.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{device.owner_email}</p>
                  <p className="text-xs text-slate-400">{device.device_label || 'Dispositivo desconhecido'}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Solicitado em {new Date(device.created_at).toLocaleString('pt-BR')}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleApprove(device)}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-green-50 py-2.5
                           text-xs font-semibold text-green-700 active:bg-green-100 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Aprovar dispositivo
              </button>
              <button
                onClick={() => handleReject(device)}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 py-2.5
                           text-xs font-semibold text-red-600 active:bg-red-100 disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Rejeitar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
