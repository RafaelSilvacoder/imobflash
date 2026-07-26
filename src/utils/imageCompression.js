// ============================================================
// imageCompression.js
// Comprime imagens no navegador ANTES do upload para o Supabase
// Storage, para economizar espaço de armazenamento no plano.
//
// Implementação nativa com Canvas (sem dependências extras).
// Se preferir usar a biblioteca 'browser-image-compression' no
// lugar, veja o bloco comentado no final deste arquivo.
// ============================================================

const MAX_WIDTH = 1200
const OUTPUT_TYPE = 'image/webp'
const QUALITY = 0.8

/**
 * Recebe um File de imagem e retorna um novo File comprimido em WebP,
 * com largura máxima de 1200px (mantendo a proporção) e qualidade 0.8.
 * Imagens já menores que MAX_WIDTH não são ampliadas, apenas recomprimidas.
 */
export async function compressImage(file, options = {}) {
  const maxWidth = options.maxWidth ?? MAX_WIDTH
  const quality = options.quality ?? QUALITY
  const outputType = options.outputType ?? OUTPUT_TYPE

  // Se o navegador não suporta o que precisamos, retorna o arquivo original
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) {
    return file
  }

  try {
    const imageBitmap = await createImageBitmap(file)

    const scale = Math.min(1, maxWidth / imageBitmap.width)
    const targetWidth = Math.round(imageBitmap.width * scale)
    const targetHeight = Math.round(imageBitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Falha ao gerar blob comprimido'))),
        outputType,
        quality
      )
    })

    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], newName, { type: outputType, lastModified: Date.now() })
  } catch (err) {
    console.warn('[ImobQuick] Falha ao comprimir imagem, enviando original:', err)
    return file
  }
}

/**
 * Comprime uma lista de arquivos em paralelo.
 */
export async function compressImages(files, options = {}) {
  if (!files || files.length === 0) return []
  return Promise.all(Array.from(files).map((file) => compressImage(file, options)))
}

// ------------------------------------------------------------
// ALTERNATIVA: usando a biblioteca 'browser-image-compression'
// ------------------------------------------------------------
// 1) Instale: npm install browser-image-compression
// 2) Substitua o conteúdo de compressImage por:
//
// import imageCompression from 'browser-image-compression'
//
// export async function compressImage(file, options = {}) {
//   const compressed = await imageCompression(file, {
//     maxWidthOrHeight: options.maxWidth ?? MAX_WIDTH,
//     initialQuality: options.quality ?? QUALITY,
//     fileType: options.outputType ?? OUTPUT_TYPE,
//     useWebWorker: true,
//   })
//   return compressed
// }
// ------------------------------------------------------------
