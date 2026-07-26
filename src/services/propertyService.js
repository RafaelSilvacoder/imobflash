import { supabase, PHOTOS_BUCKET } from '../supabaseClient'
import { compressImages } from '../utils/imageCompression'

/**
 * Comprime (WebP, max 1200px, qualidade 0.8) e faz upload de múltiplas fotos
 * para o Storage, retornando as URLs públicas.
 */
export async function uploadPropertyPhotos(files, userId) {
  if (!files || files.length === 0) return []

  // Comprime todas as imagens no cliente ANTES de subir para o Supabase,
  // economizando espaço de armazenamento no plano.
  const compressedFiles = await compressImages(files, {
    maxWidth: 1200,
    quality: 0.8,
    outputType: 'image/webp',
  })

  const uploadPromises = compressedFiles.map(async (file) => {
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/webp',
      })

    if (error) throw error

    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(fileName)
    return data.publicUrl
  })

  return Promise.all(uploadPromises)
}

/**
 * Cria um novo imóvel no banco.
 */
export async function createProperty(property) {
  const { data, error } = await supabase
    .from('properties')
    .insert([property])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Lista os imóveis do usuário logado, mais recentes primeiro.
 */
export async function listProperties(userId) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Atualiza os textos de IA de um imóvel já salvo.
 */
export async function updatePropertyAiTexts(propertyId, aiTexts) {
  const { data, error } = await supabase
    .from('properties')
    .update({ ai_texts: aiTexts })
    .eq('id', propertyId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Extrai o caminho do arquivo dentro do bucket a partir de uma URL pública
 * do Supabase Storage.
 * Ex: https://xxx.supabase.co/storage/v1/object/public/property-photos/user123/foto.webp
 *  -> user123/foto.webp
 */
function extractStoragePath(publicUrl, bucket) {
  const marker = `/object/public/${bucket}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

/**
 * Remove do Storage todas as fotos associadas a um imóvel.
 * Não lança erro se alguma foto já não existir mais.
 */
async function deletePropertyPhotos(photoUrls) {
  if (!photoUrls || photoUrls.length === 0) return

  const paths = photoUrls
    .map((url) => extractStoragePath(url, PHOTOS_BUCKET))
    .filter(Boolean)

  if (paths.length === 0) return

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(paths)

  // Loga mas não interrompe o fluxo: preferimos garantir que o registro
  // do banco seja removido mesmo se alguma foto já não existir no Storage.
  if (error) {
    console.warn('[ImobQuick] Erro ao remover fotos do Storage:', error.message)
  }
}

/**
 * Exclui um imóvel por completo:
 * 1) Remove as fotos associadas do Supabase Storage.
 * 2) Remove o registro do imóvel da tabela `properties`.
 *
 * Isso garante que o espaço de armazenamento usado pelas fotos seja
 * liberado no plano do Supabase junto com a exclusão do imóvel.
 */
export async function deleteProperty(property) {
  // Aceita tanto o objeto completo do imóvel quanto apenas o id (compatibilidade).
  const propertyId = typeof property === 'string' ? property : property.id
  const photoUrls = typeof property === 'string' ? null : property.photo_urls

  // 1) Se não recebemos as URLs das fotos, busca o registro para obtê-las
  let urlsToDelete = photoUrls
  if (!urlsToDelete) {
    const { data, error } = await supabase
      .from('properties')
      .select('photo_urls')
      .eq('id', propertyId)
      .single()

    if (error) throw error
    urlsToDelete = data?.photo_urls ?? []
  }

  // 2) Remove as fotos do Storage
  await deletePropertyPhotos(urlsToDelete)

  // 3) Remove o registro do banco
  const { error: deleteError } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (deleteError) throw deleteError
}
