import { Bed, Bath, Car, Ruler, Sparkles, MessageCircle, Trash2, Image as ImageIcon } from 'lucide-react'

export default function PropertyCard({ property, onViewTexts, onCopyWhatsapp, onDelete }) {
  const {
    title,
    type,
    purpose,
    price,
    location,
    bedrooms,
    bathrooms,
    vacancies,
    area,
    photo_urls,
  } = property

  const cover = photo_urls?.[0]
  const precoFormatado = Number(price || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Imagem */}
      <div className="relative h-44 w-full bg-slate-100">
        {cover ? (
          <img src={cover} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon size={36} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">
            {type}
          </span>
          <span className="rounded-full bg-blue-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
            {purpose}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="line-clamp-1 text-[15px] font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{location}</p>
        <p className="mt-1.5 text-lg font-extrabold text-blue-600">{precoFormatado}</p>

        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Bed size={14} /> {bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath size={14} /> {bathrooms}
          </span>
          <span className="flex items-center gap-1">
            <Car size={14} /> {vacancies}
          </span>
          <span className="flex items-center gap-1">
            <Ruler size={14} /> {area}m²
          </span>
        </div>

        {/* Ações */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => onViewTexts(property)}
            className="flex flex-col items-center gap-1 rounded-xl bg-blue-50 py-2.5 text-blue-700 active:bg-blue-100"
          >
            <Sparkles size={16} />
            <span className="text-[11px] font-medium">Textos IA</span>
          </button>
          <button
            onClick={() => onCopyWhatsapp(property)}
            className="flex flex-col items-center gap-1 rounded-xl bg-green-50 py-2.5 text-green-700 active:bg-green-100"
          >
            <MessageCircle size={16} />
            <span className="text-[11px] font-medium">Copiar Zap</span>
          </button>
          <button
            onClick={() => onDelete(property)}
            className="flex flex-col items-center gap-1 rounded-xl bg-red-50 py-2.5 text-red-600 active:bg-red-100"
            title="Remove o imóvel e as fotos do Storage"
          >
            <Trash2 size={16} />
            <span className="text-[11px] font-medium">Excluir Imóvel</span>
          </button>
        </div>
      </div>
    </div>
  )
}
