import { useState } from 'react'
import { Loader2, Home, Check } from 'lucide-react'
import { signIn, signUp, getReferralCodeFromUrl, sendPasswordReset } from '../services/authService'

export default function AuthScreen() {
  const referredBy = getReferralCodeFromUrl()

  // Se a pessoa chegou por um link de indicação (?ref=CODIGO), já abre
  // direto na aba de cadastro, em vez de login.
  const [mode, setMode] = useState(referredBy ? 'register' : 'login') // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetEmailSent, setResetEmailSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) return

    setIsLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, referredBy)
      }
      // onAuthStateChange no App.jsx cuida do redirecionamento após sucesso
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    if (!email) return

    setIsLoading(true)
    try {
      await sendPasswordReset(email)
      setResetEmailSent(true)
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o e-mail. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  function backToLogin() {
    setMode('login')
    setError('')
    setResetEmailSent(false)
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 ' +
    'placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0f172a] px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold text-white">ImobFlash</h1>
          <p className="text-center text-sm text-slate-400">
            Cadastre imóveis e gere textos de divulgação com IA, direto do celular.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-xl">
          {/* -------------------- Modo: esqueci a senha -------------------- */}
          {mode === 'forgot' ? (
            resetEmailSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-800">E-mail enviado!</p>
                <p className="text-sm text-slate-500">
                  Verifique a caixa de entrada de <strong>{email}</strong> (e o spam) e clique no
                  link para criar uma nova senha.
                </p>
                <button
                  onClick={backToLogin}
                  className="mt-2 text-sm font-semibold text-blue-600"
                >
                  Voltar para o login
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-1 text-base font-bold text-slate-900">Recuperar senha</h2>
                <p className="mb-4 text-sm text-slate-500">
                  Digite seu e-mail e enviaremos um link para você criar uma nova senha.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-600">E-mail</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@corretor.com"
                      autoComplete="email"
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
                    Enviar link de recuperação
                  </button>

                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full text-center text-sm font-medium text-slate-500"
                  >
                    Voltar para o login
                  </button>
                </form>
              </>
            )
          ) : (
            <>
              {/* -------------------- Alternância Login / Cadastro -------------------- */}
              <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    mode === 'login' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    mode === 'register' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {mode === 'register' && referredBy && (
                <div className="mb-4 rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  🎉 Você foi indicado com o código <strong>{referredBy}</strong>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">E-mail</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@corretor.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-600">Senha</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot')
                          setError('')
                        }}
                        className="text-xs font-medium text-blue-600"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={6}
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
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Home size={18} />
                  )}
                  {mode === 'login' ? 'Entrar' : 'Criar minha conta'}
                </button>
              </form>

              {mode === 'register' && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Você começa com 7 dias grátis para testar o app.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
