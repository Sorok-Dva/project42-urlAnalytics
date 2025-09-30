"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { fetchQrCode, updateQrCode } from "../api/qr"
import { useToast } from "../providers/ToastProvider"
import { QrPreview } from "../components/QrPreview"
import { DEFAULT_QR_DESIGN, downloadQr, designEquals, sanitizeDesign } from "../lib/qrDesign"
import type { QrDesign } from "../types"
import { getApiErrorMessage } from "../lib/apiError"

const MODULE_OPTIONS: Array<{ id: QrDesign["modules"]; label: string }> = [
  { id: "dots-classic", label: "Classique" },
  { id: "dots-rounded", label: "Arrondis" },
  { id: "dots-diamond", label: "Diamant" },
  { id: "dots-square", label: "Carrés" },
]

const PILOT_BORDER_OPTIONS: Array<{ id: QrDesign["pilotBorder"]; label: string }> = [
  { id: "square", label: "Carré" },
  { id: "rounded", label: "Arrondi" },
  { id: "dot", label: "Point" },
]

const PILOT_CENTER_OPTIONS: Array<{ id: QrDesign["pilotCenter"]; label: string }> = [
  { id: "dot", label: "Point" },
  { id: "rounded", label: "Arrondi" },
  { id: "square", label: "Carré" },
]

const LOGO_OPTIONS = [
  { id: "p42", label: "Logo p42.fr" },
  { id: "app", label: "Logo de votre application" },
  { id: "custom", label: "Logo personnalisé" },
  { id: "none", label: "Sans logo" },
] as const

const COLOR_PRESETS = ["#111827", "#1d4ed8", "#0284c7", "#16a34a", "#f59e0b", "#f97316", "#ef4444", "#a855f7"]

type ExportFormat = "png" | "jpg" | "svg"

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; badge?: string }> = [
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "svg", label: "SVG", badge: "starter" },
]

const PILOT_BORDER_SHAPES: Record<QrDesign["pilotBorder"], string> = {
  square: "rounded-lg",
  rounded: "rounded-3xl",
  dot: "rounded-full",
}

const PILOT_CENTER_SHAPES: Record<QrDesign["pilotCenter"], string> = {
  square: "rounded-sm",
  rounded: "rounded-xl",
  dot: "rounded-full",
}

const DetectionPreview = ({
                            border,
                            center,
                          }: {
  border: QrDesign["pilotBorder"]
  center: QrDesign["pilotCenter"]
}) => (
  <div
    className={`flex h-12 w-12 items-center justify-center border border-accent/30 bg-slate-950/70 ${PILOT_BORDER_SHAPES[border]}`}
  >
    <div
      className={`flex h-8 w-8 items-center justify-center border-2 border-accent/60 bg-slate-900 ${PILOT_BORDER_SHAPES[border]}`}
    >
      <div className={`h-4 w-4 bg-accent ${PILOT_CENTER_SHAPES[center]}`} />
    </div>
  </div>
)

const Swatch = ({ color, active, onSelect }: { color: string; active: boolean; onSelect: () => void }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`relative h-9 w-9 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
      active ? "border-accent shadow-[0_0_0_4px_rgba(56,189,248,0.25)]" : "border-slate-900 hover:border-accent/60"
    }`}
    style={{ backgroundColor: color }}
    aria-label={`Sélectionner la couleur ${color}`}
  >
    {active ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-slate-950 bg-accent" /> : null}
  </button>
)

const OptionTile = ({
                      label,
                      active,
                      onSelect,
                      children,
                    }: {
  label: string
  active: boolean
  onSelect: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={`group flex w-full flex-col gap-2 rounded-2xl border px-3 py-3 text-[11px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
      active
        ? "border-transparent bg-accent/10 text-accent shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
        : "border-slate-800 text-slate-300 hover:border-accent/40 hover:text-accent"
    }`}
  >
    <div
      className={`flex h-12 w-full items-center justify-center rounded-xl bg-slate-900/70 text-base transition ${
        active ? "text-accent" : "text-slate-200 group-hover:text-accent"
      }`}
    >
      {children}
    </div>
    <span className="text-center leading-tight">{label}</span>
  </button>
)

const buildTargetUrl = (code: string) => {
  const base = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? window.location.origin
  return `${base.replace(/\/$/, "")}/qr/${code}`
}

export const QrDesignPage = () => {
  const { qrId } = useParams<{ qrId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["qr", qrId],
    enabled: Boolean(qrId),
    queryFn: () => fetchQrCode(qrId!),
  })

  const [name, setName] = useState("")
  const [design, setDesign] = useState<QrDesign>(DEFAULT_QR_DESIGN)
  const [initialDesign, setInitialDesign] = useState<QrDesign>(DEFAULT_QR_DESIGN)
  const [initialName, setInitialName] = useState("")
  const [format, setFormat] = useState<ExportFormat>("png")
  const [customLogo, setCustomLogo] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    const sanitized = sanitizeDesign(data.design as QrDesign)
    setDesign(sanitized)
    setInitialDesign(sanitized)
    setInitialName(data.name)
    setName(data.name)
    setCustomLogo(sanitized.logo.type === "custom" ? (sanitized.logo.value ?? null) : null)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; design: QrDesign }) => updateQrCode(qrId!, payload),
    onSuccess: (response) => {
      const sanitized = sanitizeDesign(response.design as QrDesign)
      setInitialDesign(sanitized)
      setDesign(sanitized)
      setInitialName(response.name)
      setName(response.name)
      setCustomLogo(sanitized.logo.type === "custom" ? (sanitized.logo.value ?? null) : null)
      queryClient.invalidateQueries({ queryKey: ["qr"] })
      push({ title: "Design sauvegardé" })
    },
    onError: (error) => {
      push({ title: "Impossible de sauvegarder", description: getApiErrorMessage(error) })
    },
  })

  const hasChanges = useMemo(() => {
    return name !== initialName || !designEquals(design, initialDesign)
  }, [name, design, initialName, initialDesign])

  const handleSelectModule = (id: QrDesign["modules"]) => setDesign((prev) => ({ ...prev, modules: id }))
  const handleSelectBorder = (id: QrDesign["pilotBorder"]) => setDesign((prev) => ({ ...prev, pilotBorder: id }))
  const handleSelectCenter = (id: QrDesign["pilotCenter"]) => setDesign((prev) => ({ ...prev, pilotCenter: id }))

  const handleLogoChange = (id: QrDesign["logo"]["type"]) => {
    if (id === "custom") {
      fileInputRef.current?.click()
      return
    }
    setDesign((prev) => ({ ...prev, logo: { type: id, value: null } }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const value = typeof e.target?.result === "string" ? e.target.result : null
      if (value) {
        setCustomLogo(value)
        setDesign((prev) => ({ ...prev, logo: { type: "custom", value } }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleColorChange = (color: string) => {
    setDesign((prev) => ({ ...prev, foreground: color }))
  }

  const handleHexInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (!value.startsWith("#")) {
      setDesign((prev) => ({ ...prev, foreground: `#${value}` }))
    } else {
      setDesign((prev) => ({ ...prev, foreground: value }))
    }
  }

  const handleReset = () => {
    setDesign(initialDesign)
    setName(initialName)
    setCustomLogo(initialDesign.logo.type === "custom" ? (initialDesign.logo.value ?? null) : null)
  }

  const handleDownload = async () => {
    if (!data) return
    const target = buildTargetUrl(data.code)
    await downloadQr(design, target, format, name || "qr-code")
  }

  if (isLoading || !data) {
    return <div className="text-muted">Chargement de l'éditeur de QR...</div>
  }

  const targetUrl = buildTargetUrl(data.code)

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
        <span className={`text-xs ${hasChanges ? "text-amber-400" : "text-slate-500"}`}>
          {hasChanges ? "Changement non sauvegardé" : "Aucun changement en cours"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="rounded-md border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:border-accent"
            disabled={!hasChanges}
          >
            Annuler
          </button>
          <button
            onClick={() => updateMutation.mutate({ name, design })}
            className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-700"
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </section>

      <button onClick={() => navigate("/qr-codes")} className="text-xs text-accent hover:underline">
        ← Retour aux QR Codes
      </button>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-col gap-5">
              <div className="flex min-h-[260px] w-full items-center justify-center rounded-3xl border border-slate-200/60 bg-white p-6 shadow-lg">
                <div className="flex items-center justify-center">
                  <QrPreview data={targetUrl} design={design} size={260} />
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs uppercase tracking-wide text-muted">Format</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormat(option.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        format === option.id ? "bg-accent text-white" : "border border-slate-700 text-slate-200"
                      }`}
                    >
                      {option.label}
                      {option.badge && (
                        <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                          {option.badge}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="ml-auto rounded-md border border-accent px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/10"
                  >
                    Télécharger
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted">Nom du QR</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-base text-slate-100"
              />
            </div>
            <p className="break-all text-xs text-slate-500">URL encodée : {targetUrl}</p>
          </section>
        </div>

        <div className="grid gap-6 lg:col-span-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">Style du QR code</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted">Modules</h4>
                <div className="grid grid-cols-2 gap-2">
                  {MODULE_OPTIONS.map((option) => (
                    <OptionTile
                      key={option.id}
                      label={option.label}
                      active={design.modules === option.id}
                      onSelect={() => handleSelectModule(option.id)}
                    >
                      <span className="text-base">⬚</span>
                    </OptionTile>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted">Centre des repères</h4>
                <div className="grid grid-cols-3 gap-2">
                  {PILOT_CENTER_OPTIONS.map((option) => (
                    <OptionTile
                      key={option.id}
                      label={option.label}
                      active={design.pilotCenter === option.id}
                      onSelect={() => handleSelectCenter(option.id)}
                    >
                      <DetectionPreview border={design.pilotBorder} center={option.id} />
                    </OptionTile>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted">Bordure des repères</h4>
                <div className="grid grid-cols-3 gap-2">
                  {PILOT_BORDER_OPTIONS.map((option) => (
                    <OptionTile
                      key={option.id}
                      label={option.label}
                      active={design.pilotBorder === option.id}
                      onSelect={() => handleSelectBorder(option.id)}
                    >
                      <DetectionPreview border={option.id} center={design.pilotCenter} />
                    </OptionTile>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted">Couleurs</h4>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <Swatch
                    key={color}
                    color={color}
                    active={design.foreground === color}
                    onSelect={() => handleColorChange(color)}
                  />
                ))}
                <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                  <span>#</span>
                  <input
                    value={design.foreground.replace("#", "")}
                    onChange={handleHexInput}
                    className="w-16 bg-transparent text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">Logo du QR code</h3>
            <div className="grid grid-cols-4 gap-2">
              {LOGO_OPTIONS.map((option) => (
                <OptionTile
                  key={option.id}
                  label={option.label}
                  active={design.logo.type === option.id}
                  onSelect={() => handleLogoChange(option.id)}
                >
                  <span className="text-base">{option.id === "none" ? "∅" : option.id === "custom" ? "＋" : "☼"}</span>
                </OptionTile>
              ))}
            </div>
            {design.logo.type === "custom" && customLogo && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
                <img src={customLogo || "/placeholder.svg"} alt="Logo personnalisé" className="h-10 w-10 rounded" />
                <span>Logo personnalisé chargé</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default QrDesignPage
