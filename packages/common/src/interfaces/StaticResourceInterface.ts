export interface StaticResourceInterface {
  id: string
  sid: string
  url: string
  key: string
  metadata: object
  mimeType: string
  staticResourceType: string
  userId: string
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
