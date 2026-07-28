import { useEffect, useState } from 'react'
import { X, Copy, Check, Save, Loader2, Instagram, Building2, MessageCircle, Link2, RotateCcw } from 'lucide-react'
import { buildWhatsappLink } from '../utils/whatsappLink'

const TABS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'portal', label: 'Portais', icon: Building2 },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

export default function AIResultsModal({ texts, onClose, onSave, isSaving, saved, readOnly, brokerPhone }) {
  const [activeTab, setActiveTab] = useState('instagram')
  const [copiedTab, setCopiedTab] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Cópia editável dos textos: começa igual ao que a IA gerou, mas o
  // corretor pode personalizar antes de copiar (texto ou link), sem perder
  // o texto original gerado especificamente para aquele imóvel.
  const [editedTexts, setEditedTexts] = useState(texts || {})

  // Sempre que abrir o modal com um novo conjunto de textos (novo imóvel
  // gerado, ou "Ver Textos IA" de outro imóvel), reseta a edição.
  useEffect(() => {
    setEditedTexts(texts || {})
  }, [texts])

  if (!texts) return null

  function handleChangeText(tabId, value) {
    setEditedTexts((prev) => ({ ...prev, [tabId]: value }))
  }

  function handleResetText(tabId) {
    setEditedTexts((prev) => ({ ...prev, [tabId]: texts[tabId] }))
  }

  async function handleCopy(tabId) {
    try {
      await navigator.clipboard.writeText(editedTexts[tabId] || '')
      setCopiedTab(tabId)
      setTimeout(() => setCopiedTab(null), 2000)
    } catch (err) {
      console.error('Erro ao copiar texto:', err)
    }
  }

  async function handleCopyWhatsappLink() {
    const link = buildWhatsappLink(brokerPhone, editedTexts.whatsapp)
    if (!link) return

    window.open(link, '_blank', 'noopener,noreferrer')

    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar link:', err)
    }
  }

  const wasEdited = editedTexts[activeTab] !== texts[activeTab]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Textos gerados por IA</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 active:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-3 pt-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-400'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-slate-400">Toque no texto pra personalizar antes de copiar</p>
            {wasEdited && (
              <button
                onClick={() => handleResetText(activeTab)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600"
              >
                <RotateCcw size={12} /> Restaurar original
              </button>
            )}
          </div>

          <textarea
            value={editedTexts[activeTab] ?? ''}
            onChange={(e) => handleChangeText(activeTab, e.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl bg-slate-50 p-4 text-[14px] leading-relaxed text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Nenhum texto gerado ainda."
          />

          <button
            onClick={() => handleCopy(activeTab)}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
              copiedTab === activeTab
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-900 text-white active:scale-[0.98]'
            }`}
          >
            {copiedTab === activeTab ? (
              <>
                <Check size={16} /> Copiado!
              </>
            ) : (
              <>
                <Copy size={16} /> Copiar Texto
              </>
            )}
          </button>

          {activeTab === 'whatsapp' && (
            <button
              onClick={handleCopyWhatsappLink}
              disabled={!brokerPhone}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                linkCopied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-green-600 text-white active:scale-[0.98]'
              } disabled:bg-slate-200 disabled:text-slate-400`}
            >
              {linkCopied ? (
                <>
                  <Check size={16} /> Link copiado!
                </>
              ) : (
                <>
                  <Link2 size={16} />
                  {brokerPhone ? 'Abrir WhatsApp (e copiar link)' : 'Cadastre seu WhatsApp no Perfil'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer / Salvar */}
        {!readOnly && (
          <div className="border-t border-slate-100 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              onClick={onSave}
              disabled={isSaving || saved}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4
                         text-[15px] font-semibold text-white shadow-lg shadow-blue-600/30 transition
                         active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Salvando...
                </>
              ) : saved ? (
                <>
                  <Check size={18} /> Imóvel salvo!
                </>
              ) : (
                <>
                  <Save size={18} /> Salvar Imóvel
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
