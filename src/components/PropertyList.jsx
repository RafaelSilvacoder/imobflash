import { Home, Loader2 } from 'lucide-react'
import PropertyCard from './PropertyCard'

export default function PropertyList({ properties, isLoading, onViewTexts, onCopyWhatsapp, onDelete }) {
  return (
    <div className="space-y-4 px-4 pb-24 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meus Imóveis</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {properties.length} imóvel{properties.length !== 1 ? 'is' : ''} cadastrado
          {properties.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Carregando imóveis...</p>
        </div>
      )}

      {!isLoading && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Home size={32} className="text-slate-300" />
          <div>
            <p className="font-medium text-slate-600">Nenhum imóvel cadastrado ainda</p>
            <p className="mt-1 text-sm text-slate-400">
              Toque em "Novo Imóvel" para começar
            </p>
          </div>
        </div>
      )}

      {!isLoading &&
        properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onViewTexts={onViewTexts}
            onCopyWhatsapp={onCopyWhatsapp}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}
