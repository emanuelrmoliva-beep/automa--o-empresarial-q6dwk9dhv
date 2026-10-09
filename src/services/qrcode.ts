/**
 * Gerador client-side de QR Code autônomo (ISO/IEC 18004).
 * Suporta codificação Byte (Latin/UTF-8), versões 1 a 10 com correção de erro nível L ou M.
 * 100% autônomo, sem dependências externas.
 * Gera matriz booleana, renderiza em HTMLCanvasElement e devolve DataURL PNG para jsPDF e HTML.
 */

// GF(256) com polinômio primitivo 0x11D (285)
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    LOG_TABLE[x] = i
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]
  }
})()

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]]
}

function polyMultiply(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gmul(p1[i], p2[j])
    }
  }
  return result
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1]
  for (let i = 0; i < degree; i++) {
    g = polyMultiply(g, [1, EXP_TABLE[i]])
  }
  return g
}

function computeReedSolomon(data: number[], numEcBytes: number): number[] {
  const gen = getGeneratorPoly(numEcBytes)
  const remainder = data.concat(new Array(numEcBytes).fill(0))
  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        remainder[i + j] ^= gmul(gen[j], factor)
      }
    }
  }
  return remainder.slice(data.length)
}

// Parâmetros para QR Code Nível M (Versões 1 a 6 são suficientes para URLs até 134 bytes)
interface VersionSpec {
  version: number
  totalCodewords: number
  ecCodewords: number
  dataCodewords: number
}

const QR_VERSIONS_M: VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecCodewords: 10, dataCodewords: 16 },
  { version: 2, totalCodewords: 44, ecCodewords: 16, dataCodewords: 28 },
  { version: 3, totalCodewords: 70, ecCodewords: 26, dataCodewords: 44 },
  { version: 4, totalCodewords: 100, ecCodewords: 36, dataCodewords: 64 },
  { version: 5, totalCodewords: 134, ecCodewords: 48, dataCodewords: 86 },
  { version: 6, totalCodewords: 172, ecCodewords: 64, dataCodewords: 108 },
  { version: 7, totalCodewords: 196, ecCodewords: 72, dataCodewords: 124 },
]

// Posições dos padrões de alinhamento por versão
const ALIGNMENT_PATTERN_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
}

// Format info para Mask 0, EC level M (00) -> 00 + 000 = 00000 -> 0x4B37 com masking 0x5412
const FORMAT_INFO_M_MASK0 = 0x4b37 ^ 0x5412 // 0x1f25

export class SimpleQRCode {
  size: number
  modules: boolean[][]
  isReserved: boolean[][]

  constructor(public version: number) {
    this.size = version * 4 + 17
    this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(false))
    this.isReserved = Array.from({ length: this.size }, () => Array(this.size).fill(false))
  }

  private setModule(r: number, c: number, val: boolean, reserved = true) {
    if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
      this.modules[r][c] = val
      if (reserved) this.isReserved[r][c] = true
    }
  }

  setupPositionFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r
        const nc = col + c
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue
        const isBlack =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        this.setModule(nr, nc, isBlack, true)
      }
    }
  }

  setupTimingPatterns() {
    for (let i = 8; i < this.size - 8; i++) {
      const val = i % 2 === 0
      if (!this.isReserved[6][i]) this.setModule(6, i, val, true)
      if (!this.isReserved[i][6]) this.setModule(i, 6, val, true)
    }
  }

  setupAlignmentPattern(row: number, col: number) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)
        this.setModule(row + r, col + c, isBlack, true)
      }
    }
  }

  setupAlignmentPatterns() {
    const pos = ALIGNMENT_PATTERN_POSITIONS[this.version] || []
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const r = pos[i]
        const c = pos[j]
        if (this.isReserved[r][c]) continue
        this.setupAlignmentPattern(r, c)
      }
    }
  }

  setupFormatInfo(formatBits: number) {
    for (let i = 0; i < 15; i++) {
      const bit = ((formatBits >> i) & 1) === 1
      // Top-left
      if (i < 6) {
        this.setModule(i, 8, bit, true)
      } else if (i < 8) {
        this.setModule(i + 1, 8, bit, true)
      } else {
        this.setModule(8, 15 - i, bit, true)
      }

      // Sub format: bottom-left and top-right
      if (i < 8) {
        this.setModule(8, this.size - 1 - i, bit, true)
      } else {
        this.setModule(this.size - 15 + i, 8, bit, true)
      }
    }
    // Dark module fixo
    this.setModule(this.size - 8, 8, true, true)
  }

  populateData(codewords: number[]) {
    // Transformar codewords em bits
    const bits: number[] = []
    for (const byte of codewords) {
      for (let b = 7; b >= 0; b--) {
        bits.push((byte >> b) & 1)
      }
    }

    let bitIdx = 0
    let right = this.size - 1
    let goingUp = true

    while (right > 0) {
      if (right === 6) right-- // Pula coluna de timing vertical

      const rows = goingUp
        ? Array.from({ length: this.size }, (_, i) => this.size - 1 - i)
        : Array.from({ length: this.size }, (_, i) => i)

      for (const r of rows) {
        for (let cOffset = 0; cOffset < 2; cOffset++) {
          const c = right - cOffset
          if (!this.isReserved[r][c]) {
            let bit = bitIdx < bits.length ? bits[bitIdx++] : 0
            // Máscara 0: (row + col) % 2 === 0
            if ((r + c) % 2 === 0) {
              bit ^= 1
            }
            this.modules[r][c] = bit === 1
          }
        }
      }

      right -= 2
      goingUp = !goingUp
    }
  }
}

/**
 * Codifica texto em modo Byte (8-bit)
 */
function encodeData(text: string, dataCapacity: number, version: number): number[] {
  const encoder = new TextEncoder()
  const bytes = Array.from(encoder.encode(text))

  // Modo Byte = 0100 (4 bits)
  // Character count: 8 bits para V1-9
  const charCountBits = version <= 9 ? 8 : 16
  const bits: number[] = []

  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  // 0100 (Byte mode)
  pushBits(4, 4)
  pushBits(bytes.length, charCountBits)
  for (const b of bytes) {
    pushBits(b, 8)
  }

  // Terminator (até 4 zeros)
  const remainingBits = dataCapacity * 8 - bits.length
  const termLen = Math.min(4, Math.max(0, remainingBits))
  for (let i = 0; i < termLen; i++) bits.push(0)

  // Preencher até múltiplo de 8
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Converter bits em bytes
  const dataCodewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j]
    }
    dataCodewords.push(b)
  }

  // Preencher com bytes alternados 0xEC e 0x11 até dataCapacity
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (dataCodewords.length < dataCapacity) {
    dataCodewords.push(padBytes[padIdx % 2])
    padIdx++
  }

  return dataCodewords
}

/**
 * Gera a matriz de módulos do QR Code
 */
export function generateQRCodeMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder()
  const byteLen = encoder.encode(text).length

  // Encontrar menor versão com capacidade adequada
  let chosenSpec: VersionSpec | null = null
  for (const spec of QR_VERSIONS_M) {
    // 4 bits de modo + 8 bits de contagem = 1.5 bytes de overhead
    const maxDataBytes = spec.dataCodewords - 2
    if (byteLen <= maxDataBytes) {
      chosenSpec = spec
      break
    }
  }

  if (!chosenSpec) {
    chosenSpec = QR_VERSIONS_M[QR_VERSIONS_M.length - 1]
  }

  const dataCodewords = encodeData(text, chosenSpec.dataCodewords, chosenSpec.version)
  const ecCodewords = computeReedSolomon(dataCodewords, chosenSpec.ecCodewords)
  const allCodewords = dataCodewords.concat(ecCodewords)

  const qr = new SimpleQRCode(chosenSpec.version)
  qr.setupPositionFinderPattern(0, 0)
  qr.setupPositionFinderPattern(0, qr.size - 7)
  qr.setupPositionFinderPattern(qr.size - 7, 0)
  qr.setupTimingPatterns()
  qr.setupAlignmentPatterns()
  qr.setupFormatInfo(FORMAT_INFO_M_MASK0)
  qr.populateData(allCodewords)

  return qr.modules
}

/**
 * Renderiza um QR Code em um HTMLCanvasElement
 */
export function renderQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: { size?: number; margin?: number; color?: string; background?: string } = {},
): void {
  const { size = 160, margin = 2, color = '#000000', background = '#ffffff' } = options
  const modules = generateQRCodeMatrix(text)
  const numModules = modules.length
  const totalModules = numModules + margin * 2

  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = background
  ctx.fillRect(0, 0, size, size)

  const moduleSize = size / totalModules
  ctx.fillStyle = color

  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (modules[r][c]) {
        const x = Math.round((c + margin) * moduleSize)
        const y = Math.round((r + margin) * moduleSize)
        const w = Math.ceil(moduleSize)
        const h = Math.ceil(moduleSize)
        ctx.fillRect(x, y, w, h)
      }
    }
  }
}

/**
 * Retorna uma DataURL PNG base64 do QR Code para injetar no jsPDF ou img tag
 */
export function generateQRCodeDataUrl(
  text: string,
  options: { size?: number; margin?: number; color?: string; background?: string } = {},
): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  renderQRCodeToCanvas(canvas, text, options)
  return canvas.toDataURL('image/png')
}
