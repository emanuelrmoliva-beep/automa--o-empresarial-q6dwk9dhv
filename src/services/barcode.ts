/**
 * Gerador client-side de Código de Barras Code 128 (Sets A, B e C)
 * 100% autônomo, sem dependências externas ou serviços pagos.
 * Gera dados binários de barras, Canvas e DataURL para impressão em jsPDF e HTML.
 */

// Tabela oficial ISO/IEC 15417 das larguras de barras e espaços do Code 128 (107 símbolos + stop)
const CODE128_PATTERNS = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213', // 0-9
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132', // 10-19
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211', // 20-29
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313', // 30-39
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331', // 40-49
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111', // 50-59
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214', // 60-69
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111', // 70-79
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141', // 80-89
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141', // 90-99
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112', // 100-106 (106 = Stop com barra final)
]

const START_CODE_A = 103
const START_CODE_B = 104
const START_CODE_C = 105
const STOP_CODE = 106

/**
 * Normaliza o valor do código a ser impresso na etiqueta.
 * Se o produto não tiver SKU ou código, gera a partir do ID ou de um timestamp.
 */
export function getProductBarcodeValue(product: { id?: string; sku?: string }): string {
  if (product.sku && product.sku.trim().length > 0) {
    return product.sku.trim()
  }
  if (product.id && product.id.trim().length > 0) {
    // PocketBase IDs costumam ter 15 chars alfanuméricos. Limpar caracteres não-ASCII
    const cleanId = product.id.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase()
    return cleanId.length > 10 ? cleanId.slice(0, 10) : cleanId
  }
  return `PRD-${Date.now().toString().slice(-6)}`
}

/**
 * Converte uma sequência de larguras ('212222') em string binária de 1s e 0s.
 * Ímpares = barras (1), Pares = espaços (0).
 */
function patternToBinary(pattern: string): string {
  let bin = ''
  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10)
    const char = i % 2 === 0 ? '1' : '0'
    bin += char.repeat(width)
  }
  return bin
}

export interface EncodeResult {
  code: string
  patternString: string
  binary: string
  modulesCount: number
}

/**
 * Codifica uma string ASCII em Code 128 (Subset B para alfanuméricos padrão ou C para dígitos puros)
 */
export function encodeCode128(text: string): EncodeResult {
  const clean = (text || '').trim() || '0000'
  const isOnlyDigits = /^[0-9]+$/.test(clean) && clean.length >= 4 && clean.length % 2 === 0

  const symbolValues: number[] = []

  if (isOnlyDigits) {
    // Usar Code Set C (pares de dígitos)
    symbolValues.push(START_CODE_C)
    for (let i = 0; i < clean.length; i += 2) {
      const pair = parseInt(clean.slice(i, i + 2), 10)
      symbolValues.push(pair)
    }
  } else {
    // Usar Code Set B (alfanumérico padrão)
    symbolValues.push(START_CODE_B)
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i)
      // Code Set B aceita ASCII 32..127 -> valor 0..95
      let val = code - 32
      if (val < 0 || val > 95) {
        val = 31 // substituto '?' se fora da faixa
      }
      symbolValues.push(val)
    }
  }

  // Cálculo da soma ponderada de verificação (Modulo 103)
  let checkSum = symbolValues[0] // Start code com peso 1
  for (let i = 1; i < symbolValues.length; i++) {
    checkSum += symbolValues[i] * i
  }
  const checkDigit = checkSum % 103
  symbolValues.push(checkDigit)
  symbolValues.push(STOP_CODE)

  // Construir padrão binário
  let fullBinary = '0000000000' // quiet zone inicial (10 módulos)
  let patternStr = ''

  for (const sym of symbolValues) {
    const pat = CODE128_PATTERNS[sym]
    if (pat) {
      patternStr += pat
      fullBinary += patternToBinary(pat)
    }
  }

  fullBinary += '0000000000' // quiet zone final (10 módulos)

  return {
    code: clean,
    patternString: patternStr,
    binary: fullBinary,
    modulesCount: fullBinary.length,
  }
}

export interface BarcodeRenderOptions {
  width?: number
  height?: number
  color?: string
  background?: string
  displayValue?: boolean
  fontSize?: number
  fontColor?: string
}

/**
 * Renderiza o código de barras em um elemento HTMLCanvasElement
 */
export function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: BarcodeRenderOptions = {},
): void {
  const {
    width = 240,
    height = 70,
    color = '#000000',
    background = '#ffffff',
    displayValue = true,
    fontSize = 11,
    fontColor = '#334155',
  } = options

  const encoded = encodeCode128(text)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = width
  canvas.height = height

  // Fundo
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  // Altura da barra (deixa espaço para o texto se displayValue)
  const textSpace = displayValue ? fontSize + 4 : 0
  const barHeight = Math.max(10, height - textSpace - 4)
  const barY = 2

  const moduleWidth = width / encoded.modulesCount

  // Desenhar barras
  ctx.fillStyle = color
  for (let i = 0; i < encoded.binary.length; i++) {
    if (encoded.binary[i] === '1') {
      const x = Math.round(i * moduleWidth)
      const nextX = Math.round((i + 1) * moduleWidth)
      ctx.fillRect(x, barY, Math.max(1, nextX - x), barHeight)
    }
  }

  // Texto humano legível
  if (displayValue) {
    ctx.fillStyle = fontColor
    ctx.font = `bold ${fontSize}px monospace, ui-monospace, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(encoded.code, width / 2, height - 1)
  }
}

/**
 * Retorna uma DataURL (PNG base64) do código de barras pronto para injetar em jsPDF
 */
export function generateBarcodeDataUrl(text: string, options: BarcodeRenderOptions = {}): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  renderBarcodeToCanvas(canvas, text, options)
  return canvas.toDataURL('image/png')
}
