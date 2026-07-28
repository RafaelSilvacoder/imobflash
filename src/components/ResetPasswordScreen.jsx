import { useState } from 'react'
import { Loader2, KeyRound, Check } from 'lucide-react'
import { updatePassword } from '../services/authService'

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setIsLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar a senha. Tente pedir o link de novo.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 ' +
    'placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0f172a] px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-white">ImobFlash</h1>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-xl">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-800">Senha atualizada!</p>
              <p className="text-sm text-slate-500">
                Você já pode fechar esta aba e entrar normalmente com a nova senha.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <KeyRound size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Defina sua nova senha</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">
                    Confirme a nova senha
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5
                             text-[15px] font-semibold text-white shadow-lg shadow-blue-600/30 transition
                             active:scale-[0.98] disabled:bg-slate-300"
                >
                  {isLoading && <Loader2 size={18} className="animate-spin" />}
                  Salvar nova senha
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
