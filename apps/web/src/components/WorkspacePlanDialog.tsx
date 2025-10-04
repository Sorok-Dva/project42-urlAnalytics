import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchWorkspacePlans, selectWorkspacePlanRequest } from '../api/workspaces'
import { MockPaymentDialog, type MockPaymentOption } from './MockPaymentDialog'
import { useToast } from '../providers/ToastProvider'
import { getPlanDisplayName } from '../lib/planLimits'
import { getApiErrorMessage } from '../lib/apiError'
import type { SubscriptionPlan, WorkspaceDetail } from '../types'

interface WorkspacePlanDialogProps {
  open: boolean
  workspaceId: string | null
  workspaceName?: string
  currentPlanId?: string | null
  currentPlanSlug?: string
  onClose: () => void
  onSuccess?: (workspace: WorkspaceDetail) => void
}

const formatPrice = (plan: SubscriptionPlan) => {
  if (plan.priceCents === 0) return 'Gratuit'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: plan.currency
    }).format(plan.priceCents / 100)
  } catch {
    return `${(plan.priceCents / 100).toFixed(2)} ${plan.currency}`
  }
}

const formatLimit = (label: string, value?: number | null) => {
  if (value === null) return `${label} : Illimités`
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${label} : ${new Intl.NumberFormat('fr-FR').format(value)}`
  }
  return `${label} : Par défaut`
}

export const WorkspacePlanDialog = ({
  open,
  workspaceId,
  workspaceName,
  currentPlanId,
  currentPlanSlug,
  onClose,
  onSuccess
}: WorkspacePlanDialogProps) => {
  const { push } = useToast()

  const plansQuery = useQuery({
    queryKey: ['workspaces', 'available-plans'],
    queryFn: fetchWorkspacePlans,
    enabled: open
  })

  const selectPlanMutation = useMutation({
    mutationFn: ({ planId, workspaceId: targetWorkspaceId }: { planId: string; workspaceId: string }) =>
      selectWorkspacePlanRequest(targetWorkspaceId, { planId }),
    onSuccess: workspace => {
      push({
        title: 'Plan mis à jour',
        description: `${workspace.name} utilise désormais le plan ${getPlanDisplayName(workspace.plan)}.`
      })
      onSuccess?.(workspace)
      onClose()
    },
    onError: error => {
      push({ title: 'Impossible de modifier le plan', description: getApiErrorMessage(error) })
    }
  })

  const plans = plansQuery.data ?? []

  const currentPlanOptionId = useMemo(() => {
    if (currentPlanId) return currentPlanId
    const fallback = plans.find(plan => plan.slug === currentPlanSlug)
    return fallback?.id ?? null
  }, [plans, currentPlanId, currentPlanSlug])

  const options = useMemo<MockPaymentOption[]>(() => {
    return plans.map(plan => {
      const isCurrentPlan = currentPlanOptionId ? plan.id === currentPlanOptionId : plan.slug === currentPlanSlug
      const badges: string[] = []
      if (isCurrentPlan) badges.push('Plan actuel')
      else if (plan.isDefault) badges.push('Plan par défaut')
      const benefits = [
        formatLimit('Espaces', plan.workspaceLimit),
        formatLimit('Liens / espace', plan.linkLimitPerWorkspace)
      ]
      const benefitText = [...badges, ...benefits].join(' · ')
      return {
        id: plan.id,
        label: plan.name,
        description: plan.description ?? 'Aucune description fournie pour ce plan.',
        price: formatPrice(plan),
        benefit: benefitText
      }
    })
  }, [plans, currentPlanOptionId, currentPlanSlug])

  const handleClose = () => {
    if (selectPlanMutation.isPending) return
    onClose()
  }

  const handleConfirm = (option: MockPaymentOption) => {
    if (!workspaceId) return
    const isCurrent = currentPlanOptionId ? option.id === currentPlanOptionId : false
    if (isCurrent) {
      push({
        title: 'Plan actuel',
        description: `${workspaceName ?? 'Cet espace'} utilise déjà ce plan.`
      })
      return
    }
    selectPlanMutation.mutate({ planId: option.id, workspaceId })
  }

  return (
    <MockPaymentDialog
      open={open}
      intent="workspace"
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={workspaceName ? `Choisir un plan pour ${workspaceName}` : 'Choisir un plan'}
      description="Sélectionnez un plan pour ajuster vos limites d’espaces et de liens."
      options={options}
      loading={plansQuery.isLoading}
      confirmLabel={selectPlanMutation.isPending ? 'Mise à jour…' : 'Sélectionner ce plan'}
      cancelLabel="Annuler"
      selectedOptionId={currentPlanOptionId}
      emptyMessage="Aucun plan actif n’est disponible pour le moment."
      confirmDisabled={selectPlanMutation.isPending || !workspaceId}
    />
  )
}
