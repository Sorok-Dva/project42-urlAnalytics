import { useEffect, useMemo, useState } from 'react'

export type MockPaymentIntent = 'workspace' | 'links'

interface MockPaymentOption {
  id: string
  label: string
  description: string
  price: string
  benefit?: string
}

interface MockPaymentDialogProps {
  open: boolean
  intent: MockPaymentIntent
  onClose: () => void
  onConfirm?: (option: MockPaymentOption) => void
}

const contentByIntent: Record<MockPaymentIntent, { title: string; description: string; options: MockPaymentOption[] }> = {
  workspace: {
    title: 'Ajouter des espaces de travail',
    description:
      'Débloquez davantage d’espaces pour organiser vos projets. Cette simulation vous permet de tester le flux d’achat.',
    options: [
      {
        id: 'premium-workspaces',
        label: 'Premium — 3 espaces',
        description: 'Passez au plan Premium pour gérer jusqu’à 3 espaces de travail actifs.',
        price: '19€ / mois',
        benefit: '+2 espaces de travail et support standard'
      },
      {
        id: 'scale-workspaces',
        label: 'Scale — 10 espaces',
        description: 'Pensé pour les organisations multi-marques qui ont besoin de flexibilité complète.',
        price: '39€ / mois',
        benefit: '+9 espaces de travail, support prioritaire et SLA 99,9%'
      }
    ]
  },
  links: {
    title: 'Augmenter la limite de liens',
    description:
      'Choisissez un pack pour étendre le nombre de liens disponibles au sein de votre espace de travail.',
    options: [
      {
        id: 'boost-50-links',
        label: 'Booster +50 liens',
        description: 'Ajoutez 50 liens supplémentaires utilisables immédiatement sur votre workspace actuel.',
        price: '9€ / mois',
        benefit: '+50 liens et monitoring avancé'
      },
      {
        id: 'scale-200-links',
        label: 'Scale +200 liens',
        description: 'Idéal pour les équipes marketing qui gèrent des campagnes massives.',
        price: '24€ / mois',
        benefit: '+200 liens, rapports automatisés et assistance dédiée'
      }
    ]
  }
}

export const MockPaymentDialog = ({ open, intent, onClose, onConfirm }: MockPaymentDialogProps) => {
  const { title, description, options } = useMemo(() => contentByIntent[intent], [intent])
  const [selectedOption, setSelectedOption] = useState(() => options[0]?.id ?? '')

  useEffect(() => {
    if (open && options.length > 0) {
      setSelectedOption(options[0].id)
    }
  }, [open, options])

  if (!open) return null

  const handleConfirm = () => {
    const option = options.find(item => item.id === selectedOption)
    if (!option) return
    onConfirm?.(option)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Fermer
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {options.map(option => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                selectedOption === option.id
                  ? 'border-accent/80 bg-accent/10 shadow-inner'
                  : 'border-slate-800 bg-slate-900/60 hover:border-accent/40'
              }`}
            >
              <input
                type="radio"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={event => setSelectedOption(event.target.value)}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{option.label}</span>
                  <span className="text-sm font-medium text-accent">{option.price}</span>
                </div>
                <p className="text-xs text-slate-400">{option.description}</p>
                {option.benefit && <p className="text-xs font-medium text-emerald-300">{option.benefit}</p>}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-700 px-4 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption}
            className="rounded-md border border-accent/70 bg-accent/20 px-4 py-2 text-xs font-semibold text-accent transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Simuler le paiement
          </button>
        </div>
      </div>
    </div>
  )
}

