// ============================================================
// whatsappLink.js
// Gera links clicáveis do WhatsApp (wa.me), prontos para colar
// no campo de link de anúncios (Facebook Ads, Instagram, etc)
// ou enviar em qualquer lugar — ao clicar, abre direto a conversa
// no WhatsApp do corretor, já com uma mensagem pré-preenchida.
// ============================================================

/**
 * Normaliza um telefone brasileiro pro formato exigido pelo wa.me:
 * só dígitos, com código do país (55) na frente.
 * Aceita entradas como "(81) 99680-6002", "81996806002", "5581996806002" etc.
 */
export function formatPhoneForWhatsapp(phone) {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Já vem com código do país (ex: 5581996806002 -> 13 dígitos)
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }

  // DDD + número (10 ou 11 dígitos) -> adiciona o 55 na frente
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  // Formato não reconhecido: devolve como está, só com dígitos
  return digits
}

/**
 * Monta o link clicável do WhatsApp com mensagem pré-preenchida.
 * Retorna null se não houver telefone válido.
 */
export function buildWhatsappLink(phone, message) {
  const formattedPhone = formatPhoneForWhatsapp(phone)
  if (!formattedPhone) return null

  const encodedMessage = encodeURIComponent(message || '')
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}
