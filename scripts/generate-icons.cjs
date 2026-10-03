const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function generateThemePng(width, height) {
  const buffer = Buffer.alloc(width * height * 4)

  const bgR = 15,
    bgG = 23,
    bgB = 42 // #0F172A
  const emR = 16,
    emG = 185,
    emB = 129 // #10B981
  const emLightR = 52,
    emLightG = 211,
    emLightB = 153 // #34D399
  const whiteR = 248,
    whiteG = 250,
    whiteB = 252 // #F8FAFC

  const cx = width / 2
  const cy = height / 2
  const pad = width * 0.08

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      let r = bgR
      let g = bgG
      let b = bgB
      let a = 255

      const insideBox = x >= pad && x <= width - pad && y >= pad && y <= height - pad
      const dx = Math.abs(x - cx)
      const dy = Math.abs(y - cy)
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (insideBox) {
        const factor = (y - pad) / (height - 2 * pad)
        r = Math.round(11 * (1 - factor) + 2 * factor)
        g = Math.round(19 * (1 - factor) + 44 * factor)
        b = Math.round(43 * (1 - factor) + 34 * factor)
      }

      const distBorderX = Math.min(Math.abs(x - pad), Math.abs(x - (width - pad)))
      const distBorderY = Math.min(Math.abs(y - pad), Math.abs(y - (height - pad)))
      if (insideBox && (distBorderX < 3 || distBorderY < 3)) {
        r = emR
        g = emG
        b = emB
      }

      if (dist < width * 0.32) {
        const glowFactor = (1 - dist / (width * 0.32)) * 0.4
        r = Math.round(r * (1 - glowFactor) + emR * glowFactor)
        g = Math.round(g * (1 - glowFactor) + emR * glowFactor)
        b = Math.round(b * (1 - glowFactor) + emB * glowFactor)
      }

      const barYBase = height * 0.72
      for (let i = 0; i < 5; i++) {
        const barXStart = width * (0.24 + i * 0.11)
        const barWidth = width * 0.07
        const barHeight = height * (0.15 + i * 0.09)
        if (
          x >= barXStart &&
          x <= barXStart + barWidth &&
          y <= barYBase &&
          y >= barYBase - barHeight
        ) {
          r = Math.round(r * 0.7 + emR * 0.3)
          g = Math.round(g * 0.7 + emG * 0.3)
          b = Math.round(b * 0.7 + emB * 0.3)
        }
      }

      const targetCurveY = height * 0.68 - ((x - width * 0.22) / (width * 0.58)) * (height * 0.4)
      if (x >= width * 0.22 && x <= width * 0.78 && Math.abs(y - targetCurveY) < width * 0.02) {
        r = emLightR
        g = emLightG
        b = emLightB
      }

      const arrowTipX = width * 0.76
      const arrowTipY = height * 0.28
      const dArrow = Math.sqrt((x - arrowTipX) ** 2 + (y - arrowTipY) ** 2)
      if (dArrow <= width * 0.04) {
        r = emLightR
        g = emLightG
        b = emLightB
      }
      if (dArrow <= width * 0.016) {
        r = whiteR
        g = whiteG
        b = whiteB
      }

      const aLeft = width * 0.34
      const aTop = height * 0.42
      const aBot = height * 0.72
      const aWidth = width * 0.18
      const aMidX = aLeft + aWidth / 2

      if (y >= aTop && y <= aBot) {
        const progress = (y - aTop) / (aBot - aTop)
        const leftLegX = aMidX - progress * (aWidth / 2)
        const rightLegX = aMidX + progress * (aWidth / 2)
        const thickness = width * 0.028

        if (Math.abs(x - leftLegX) < thickness || Math.abs(x - rightLegX) < thickness) {
          r = whiteR
          g = whiteG
          b = whiteB
        }

        if (
          Math.abs(y - (aTop + (aBot - aTop) * 0.55)) < thickness * 0.8 &&
          x >= leftLegX &&
          x <= rightLegX
        ) {
          r = whiteR
          g = whiteG
          b = whiteB
        }
      }

      const eLeft = width * 0.55
      const eTop = height * 0.44
      const eBot = height * 0.72
      const eWidth = width * 0.16
      const eThick = width * 0.028

      if (x >= eLeft && x <= eLeft + eWidth && y >= eTop && y <= eBot) {
        const isSpine = x <= eLeft + eThick
        const isTopBar = y <= eTop + eThick
        const isMidBar = Math.abs(y - (eTop + eBot) / 2) <= eThick / 2 && x <= eLeft + eWidth * 0.85
        const isBotBar = y >= eBot - eThick

        if (isSpine || isTopBar || isMidBar || isBotBar) {
          r = emLightR
          g = emLightG
          b = emLightB
        }
      }

      buffer[idx] = r
      buffer[idx + 1] = g
      buffer[idx + 2] = b
      buffer[idx + 3] = a
    }
  }

  return encodePng(width, height, buffer)
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdr = createChunk('IHDR', ihdrData)

  const scanlineLength = width * 4 + 1
  const rawData = Buffer.alloc(height * scanlineLength)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength
    rawData[rowOffset] = 0
    rgba.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4)
  }

  const compressed = zlib.deflateSync(rawData)
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuf = Buffer.from(type, 'ascii')
  const toCrc = Buffer.concat([typeBuf, data])
  const crc = crc32(toCrc)

  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc >>> 0, 0)

  return Buffer.concat([length, typeBuf, data, crcBuf])
}

const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1)
    } else {
      c = c >>> 1
    }
  }
  crcTable[n] = c
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return c ^ 0xffffffff
}

const publicDir = path.resolve(process.cwd(), 'public')
console.log('Gerando pwa-192x192.png...')
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateThemePng(192, 192))

console.log('Gerando pwa-512x512.png...')
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateThemePng(512, 512))

console.log('Gerando apple-touch-icon.png...')
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateThemePng(180, 180))

console.log('Ícones PNG criados com sucesso!')
