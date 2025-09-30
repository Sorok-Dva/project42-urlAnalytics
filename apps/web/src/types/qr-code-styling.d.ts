declare module 'qr-code-styling' {
  interface CornerOptions {
    type?: string
    color?: string
  }

  interface DotsOptions {
    type?: string
    color?: string
  }

  interface BackgroundOptions {
    color?: string
  }

  interface ImageOptions {
    crossOrigin?: string
    margin?: number
    hideBackgroundDots?: boolean
  }

  interface Options {
    width?: number
    height?: number
    data: string
    image?: string | null
    dotsOptions?: DotsOptions
    cornersSquareOptions?: CornerOptions
    cornersDotOptions?: CornerOptions
    backgroundOptions?: BackgroundOptions
    imageOptions?: ImageOptions
  }

  type Extension = 'png' | 'svg' | 'jpeg'

  export default class QRCodeStyling {
    constructor(options: Options)
    append(element: HTMLElement): void
    update(options: Options): void
    getRawData(extension?: Extension): Promise<Blob>
    download(options?: { name?: string; extension?: Extension }): Promise<void>
  }
}
