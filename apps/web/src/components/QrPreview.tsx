import { useEffect, useRef } from 'react'
import type { QrDesign } from '../types'
import { renderQrToElement, updateQrInstance } from '../lib/qrDesign'
import QRCodeStyling from 'qr-code-styling'

interface Props {
  data: string
  design: QrDesign
  size?: number
  className?: string
}

export const QrPreview = ({ data, design, size = 200, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    instanceRef.current = renderQrToElement(containerRef.current, design, data, size)
  }, [])

  useEffect(() => {
    updateQrInstance(instanceRef.current, design, data, size)
  }, [data, design, size])

  return <div ref={containerRef} className={className} />
}

export default QrPreview
