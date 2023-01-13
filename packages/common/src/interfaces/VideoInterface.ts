export interface VideoInterface {
  id: string
  name?: string
  tags?: string[]
  height: number
  width: number
  duration: number
  src: string
  thumbnail?: string
}
