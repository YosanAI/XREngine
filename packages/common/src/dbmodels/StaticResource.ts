export interface StaticResourceInterface {
  id: string
  sid: string
  url: string
  key: string
  mimeType: string
  metadata: any
  project?: string
  driver?: string
  fullQualityURL?: string
  lowQualityURL?: string
  mobileQualityURL?: string
  fullQualitySize?: number
  lowQualitySize?: number
  mobileQualitySize?: number
  attribution?: string
  licensing?: string
  tags?: string[]
}
