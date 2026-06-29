export type AsciiArtProps = {
  text?: string
  font?: 'tiny' | 'block' | 'shade' | 'slick' | 'huge' | 'grid' | 'pallet'
  color?: string
}

export function AsciiArt({
  text = 'BROCODE',
  font = 'slick',
  color = '#00FFFF',
}: AsciiArtProps) {
  return <ascii-font text={text} font={font} color={color} />
}
