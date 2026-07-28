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
 * Monta o link clicável do WhatsApp.
 * Se `message` for informado, o link já abre a conversa com a mensagem
 * pré-preenchida (bom pro botão "Abrir WhatsApp" dentro do app).
 * Se `message` for omitido, gera um link limpo (sem parâmetros), ideal
 * pra colar dentro do próprio texto do anúncio/post.
 * Retorna null se não houver telefone válido.
 */
export function buildWhatsappLink(phone, message) {
  const formattedPhone = formatPhoneForWhatsapp(phone)
  if (!formattedPhone) return null

  if (!message) {
    return `https://wa.me/${formattedPhone}`
  }

  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

/**
 * Insere o link limpo do WhatsApp ao final de um texto (ex: o texto do
 * WhatsApp/Instagram/Portal gerado pela IA), pronto pra ser postado com
 * o link já clicável dentro do próprio texto — sem precisar de botão
 * separado no anúncio.
 * Se não houver telefone válido, devolve o texto original sem alteração.
 */
export function appendWhatsappLinkToText(text, phone) {
  const link = buildWhatsappLink(phone)
  if (!link) return text
  return `${text || ''}\n\n👉 Fale comigo agora: ${link}`
}
