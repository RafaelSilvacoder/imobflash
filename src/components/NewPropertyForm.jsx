import { useRef, useState } from 'react'
import { Sparkles, ImagePlus, X, Loader2, ChevronDown, Home } from 'lucide-react'

const TIPOS = ['Casa', 'Apartamento', 'Terreno', 'Comercial']
const FINALIDADES = ['Venda', 'Aluguel']

const INITIAL_STATE = {
  title: '',
  type: 'Casa',
  purpose: 'Venda',
  price: '',
  location: '',
  bedrooms: '',
  bathrooms: '',
  vacancies: '',
  area: '',
  details: '',
  acceptsSubsidy: false,
  minIncome: '',
  subsidyValue: '',
  downPaymentInfo: '',
}

export default function NewPropertyForm({ onGenerate, isGenerating, brokerInfoComplete, onGoToProfile }) {
  const [form, setForm] = useState(INITIAL_STATE)
  const [photos, setPhotos] = useState([])
  const [showFinancing, setShowFinancing] = useState(false)
  const fileInputRef = useRef(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || [])
    const withPreview = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }))
    setPhotos((prev) => [...prev, ...withPreview])
    e.target.value = '' // permite re-selecionar o mesmo arquivo depois
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  function isValid() {
    return form.title.trim() && form.price && form.location.trim()
  }

  function handleSubmit() {
    if (!isValid() || isGenerating) return
    onGenerate({
      ...form,
      price: Number(form.price) || 0,
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      vacancies: Number(form.vacancies) || 0,
      area: Number(form.area) || 0,
      minIncome: form.acceptsSubsidy && form.minIncome ? Number(form.minIncome) : null,
      subsidyValue: form.acceptsSubsidy && form.subsidyValue ? Number(form.subsidyValue) : null,
      downPaymentInfo: form.acceptsSubsidy ? form.downPaymentInfo : '',
      photos: photos.map((p) => p.file),
    })
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 ' +
    'placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100'

  const labelClass = 'mb-1.5 block text-sm font-medium text-slate-600'

  return (
    <div className="space-y-5 px-4 pb-32 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Novo Imóvel</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Preencha os dados e deixe a IA criar a divulgação pra você.
        </p>
      </div>

      {!brokerInfoComplete && (
        <button
          type="button"
          onClick={onGoToProfile}
          className="w-full rounded-xl bg-amber-50 px-4 py-3 text-left text-xs font-medium text-amber-700 active:bg-amber-100"
        >
          ⚠️ Preencha seu nome e CRECI no Perfil para eles aparecerem automaticamente nos seus
          anúncios. Toque aqui para preencher.
        </button>
      )}

      {/* Título */}
      <div>
        <label className={labelClass}>Título do anúncio</label>
        <input
          className={inputClass}
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Ex: Casa térrea com quintal amplo"
        />
      </div>

      {/* Tipo / Finalidade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tipo</label>
          <select className={inputClass} name="type" value={form.type} onChange={handleChange}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Finalidade</label>
          <select
            className={inputClass}
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
          >
            {FINALIDADES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Valor */}
      <div>
        <label className={labelClass}>Valor (R$)</label>
        <input
          className={inputClass}
          name="price"
          type="number"
          inputMode="decimal"
          value={form.price}
          onChange={handleChange}
          placeholder="Ex: 450000"
        />
      </div>

      {/* Localização */}
      <div>
        <label className={labelClass}>Cidade / Bairro</label>
        <input
          className={inputClass}
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="Ex: Boa Viagem, Recife - PE"
        />
      </div>

      {/* Quartos / Banheiros / Vagas / Área */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className={labelClass}>Quartos</label>
          <input
            className={inputClass + ' px-2 text-center'}
            name="bedrooms"
            type="number"
            inputMode="numeric"
            value={form.bedrooms}
            onChange={handleChange}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelClass}>Banh.</label>
          <input
            className={inputClass + ' px-2 text-center'}
            name="bathrooms"
            type="number"
            inputMode="numeric"
            value={form.bathrooms}
            onChange={handleChange}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelClass}>Vagas</label>
          <input
            className={inputClass + ' px-2 text-center'}
            name="vacancies"
            type="number"
            inputMode="numeric"
            value={form.vacancies}
            onChange={handleChange}
            placeholder="0"
          />
        </div>
        <div>
          <label className={labelClass}>Área m²</label>
          <input
            className={inputClass + ' px-2 text-center'}
            name="area"
            type="number"
            inputMode="numeric"
            value={form.area}
            onChange={handleChange}
            placeholder="0"
          />
        </div>
      </div>

      {/* Diferenciais */}
      <div>
        <label className={labelClass}>Diferenciais do imóvel</label>
        <textarea
          className={inputClass + ' min-h-[96px] resize-none'}
          name="details"
          value={form.details}
          onChange={handleChange}
          placeholder="Ex: Vista mar, piscina, reformado, próximo ao metrô..."
        />
      </div>

      {/* Financiamento / Subsídio (opcional, retrátil) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFinancing((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Home size={16} className="text-blue-600" />
            Financiamento / Subsídio (opcional)
          </span>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${showFinancing ? 'rotate-180' : ''}`}
          />
        </button>

        {showFinancing && (
          <div className="space-y-3 border-t border-slate-100 px-4 py-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="acceptsSubsidy"
                checked={form.acceptsSubsidy}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Este imóvel aceita subsídio (Minha Casa Minha Vida / financiamento facilitado)
            </label>

            {form.acceptsSubsidy && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Renda mínima (R$)</label>
                    <input
                      className={inputClass}
                      name="minIncome"
                      type="number"
                      inputMode="decimal"
                      value={form.minIncome}
                      onChange={handleChange}
                      placeholder="Ex: 1400"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Valor do subsídio (R$)</label>
                    <input
                      className={inputClass}
                      name="subsidyValue"
                      type="number"
                      inputMode="decimal"
                      value={form.subsidyValue}
                      onChange={handleChange}
                      placeholder="Ex: 75000"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Condição de entrada</label>
                  <input
                    className={inputClass}
                    name="downPaymentInfo"
                    value={form.downPaymentInfo}
                    onChange={handleChange}
                    placeholder="Ex: Entrada facilitada, use seu FGTS"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upload de fotos */}
      <div>
        <label className={labelClass}>Fotos do imóvel</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed
                     border-slate-300 bg-slate-50 py-6 text-slate-500 active:bg-slate-100"
        >
          <ImagePlus size={22} />
          <span className="text-sm font-medium">Adicionar fotos</span>
        </button>

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão principal */}
      <button
        onClick={handleSubmit}
        disabled={!isValid() || isGenerating}
        className="fixed bottom-20 left-4 right-4 z-30 mx-auto flex max-w-md items-center justify-center
                   gap-2 rounded-2xl bg-blue-600 py-4 text-[15px] font-semibold text-white shadow-lg
                   shadow-blue-600/30 transition active:scale-[0.98] disabled:cursor-not-allowed
                   disabled:bg-slate-300 disabled:shadow-none"
      >
        {isGenerating ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Gerando textos...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Gerar Textos de Divulgação com IA
          </>
        )}
      </button>
    </div>
  )
}
