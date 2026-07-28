import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { generatePropertyTexts } from './services/aiService'
import {
  uploadPropertyPhotos,
  createProperty,
  listProperties,
  deleteProperty,
} from './services/propertyService'
import { getMyProfile, hasActiveSubscription, isAdmin, hasBrokerInfo } from './services/profileService'
import { registerCurrentDevice } from './services/deviceService'
import { buildWhatsappLink, appendWhatsappLinkToText } from './utils/whatsappLink'

import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import SubscriptionGate from './components/SubscriptionGate'
import DeviceBlockedScreen from './components/DeviceBlockedScreen'
import AdminPanel from './components/AdminPanel'
import BottomNav from './components/BottomNav'
import NewPropertyForm from './components/NewPropertyForm'
import PropertyList from './components/PropertyList'
import ReferralSection from './components/ReferralSection'
import ProfileScreen from './components/ProfileScreen'
import AIResultsModal from './components/AIResultsModal'
import { Loader2 } from 'lucide-react'

export default function App() {
  // --------------------------------------------------------
  // Sessão / Perfil
  // --------------------------------------------------------
  const [session, setSession] = useState(undefined) // undefined = carregando, null = deslogado
  const [profile, setProfile] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  // 'checking' | 'approved' | 'blocked' | 'rejected' | 'revoked'
  const [deviceStatus, setDeviceStatus] = useState('checking')

  const [activeTab, setActiveTab] = useState('new')

  const [properties, setProperties] = useState([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [modalTexts, setModalTexts] = useState(null)
  const [modalReadOnly, setModalReadOnly] = useState(false)
  const [pendingProperty, setPendingProperty] = useState(null)

  // --------------------------------------------------------
  // Autenticação
  // --------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Disparado quando a pessoa clica no link de "esqueci minha senha"
      // recebido por e-mail — mostra a tela de definir nova senha em vez
      // do fluxo normal do app.
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      setSession(newSession)
      if (!newSession) {
        setProfile(null)
        setShowAdminPanel(false)
      }
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  // Carrega o perfil (assinatura, role, indicação) assim que há sessão
  useEffect(() => {
    if (session?.user?.id) {
      loadProfile(session.user.id)
    }
  }, [session?.user?.id])

  async function loadProfile(userId) {
    setIsLoadingProfile(true)
    try {
      const data = await getMyProfile(userId)
      setProfile(data)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  // Checa/registra o dispositivo atual assim que temos perfil + assinatura válida.
  // Admins ficam isentos, para nunca ficarem trancados fora do próprio painel.
  useEffect(() => {
    if (!profile) return
    if (isAdmin(profile)) {
      setDeviceStatus('approved')
      return
    }

    let cancelled = false
    setDeviceStatus('checking')

    registerCurrentDevice()
      .then((status) => {
        if (!cancelled) setDeviceStatus(status)
      })
      .catch((err) => {
        console.error('Erro ao verificar dispositivo:', err)
        // Em caso de falha na checagem (ex: função ainda não criada no banco),
        // não bloqueia o acesso — evita travar o app por erro de infraestrutura.
        if (!cancelled) setDeviceStatus('approved')
      })

    return () => {
      cancelled = true
    }
  }, [profile?.id])

  // Carrega imóveis quando a aba "Meus Imóveis" é aberta
  useEffect(() => {
    if (activeTab === 'list' && session?.user?.id) {
      loadProperties()
    }
  }, [activeTab, session?.user?.id])

  async function loadProperties() {
    setIsLoadingProperties(true)
    try {
      const data = await listProperties(session.user.id)
      setProperties(data)
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar imóveis: ' + err.message)
    } finally {
      setIsLoadingProperties(false)
    }
  }

  // --------------------------------------------------------
  // Fluxo: gerar textos com IA
  // --------------------------------------------------------
  async function handleGenerate(formData) {
    setIsGenerating(true)
    try {
      // Anexa os dados do corretor (salvos uma vez no Perfil) para que a IA
      // os inclua automaticamente nos textos, sem o corretor repetir a cada anúncio.
      const propertyWithBroker = {
        ...formData,
        brokerName: profile?.broker_name || '',
        brokerPhone: profile?.broker_phone || '',
        creci: profile?.creci || '',
      }

      const texts = await generatePropertyTexts(propertyWithBroker)

      // Insere o link clicável do WhatsApp direto dentro do texto do
      // WhatsApp — assim, ao colar o texto num post/anúncio, o link já
      // vem junto, clicável, sem precisar de nenhum botão separado.
      const textsWithLink = {
        ...texts,
        whatsapp: appendWhatsappLinkToText(texts.whatsapp, profile?.broker_phone),
      }

      setModalTexts(textsWithLink)
      setModalReadOnly(false)
      setSaved(false)
      setPendingProperty(formData)
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar textos com IA: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // --------------------------------------------------------
  // Fluxo: salvar imóvel (com compressão + upload de fotos)
  // --------------------------------------------------------
  async function handleSaveProperty() {
    if (!pendingProperty || !modalTexts) return
    const userId = session?.user?.id
    if (!userId) {
      alert('Você precisa estar logado para salvar um imóvel.')
      return
    }

    setIsSaving(true)
    try {
      const photoUrls = await uploadPropertyPhotos(pendingProperty.photos, userId)

      await createProperty({
        user_id: userId,
        title: pendingProperty.title,
        type: pendingProperty.type,
        purpose: pendingProperty.purpose,
        price: pendingProperty.price,
        location: pendingProperty.location,
        bedrooms: pendingProperty.bedrooms,
        bathrooms: pendingProperty.bathrooms,
        vacancies: pendingProperty.vacancies,
        area: pendingProperty.area,
        details: pendingProperty.details,
        accepts_subsidy: pendingProperty.acceptsSubsidy || false,
        min_income: pendingProperty.minIncome ?? null,
        subsidy_value: pendingProperty.subsidyValue ?? null,
        down_payment_info: pendingProperty.downPaymentInfo || null,
        ai_texts: modalTexts,
        photo_urls: photoUrls,
      })

      setSaved(true)
      setTimeout(() => {
        closeModal()
        setActiveTab('list')
        loadProperties()
      }, 900)
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar imóvel: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  function closeModal() {
    setModalTexts(null)
    setModalReadOnly(false)
    setPendingProperty(null)
    setSaved(false)
  }

  // --------------------------------------------------------
  // Ações da listagem
  // --------------------------------------------------------
  function handleViewTexts(property) {
    setModalTexts(
      property.ai_texts && Object.keys(property.ai_texts).length > 0
        ? property.ai_texts
        : { instagram: '', portal: '', whatsapp: 'Este imóvel ainda não possui textos gerados.' }
    )
    setModalReadOnly(true)
  }

  async function handleCopyWhatsapp(property) {
    const precoFormatado = Number(property.price || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    const message =
      property.ai_texts?.whatsapp ||
      `Olá! Tenho uma ótima oportunidade: ${property.title} em ${property.location} por ${precoFormatado}. Vamos conversar?`

    const link = buildWhatsappLink(profile?.broker_phone, message)

    if (!link) {
      alert(
        'Cadastre seu WhatsApp na aba Perfil pra gerar o link do WhatsApp (com DDD, ex: 81999998888).'
      )
      try {
        await navigator.clipboard.writeText(message)
      } catch (err) {
        console.error(err)
      }
      return
    }

    // Abre o WhatsApp direto (funciona igual clicar num link de anúncio)
    window.open(link, '_blank', 'noopener,noreferrer')

    // E também copia, caso o corretor queira colar em algum anúncio depois
    try {
      await navigator.clipboard.writeText(link)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(property) {
    if (
      !confirm(
        `Excluir o imóvel "${property.title}"? As fotos também serão removidas do armazenamento. Essa ação não pode ser desfeita.`
      )
    )
      return
    try {
      // Passa o objeto completo para que deleteProperty remova as fotos
      // do Storage antes de excluir o registro do banco.
      await deleteProperty(property)
      setProperties((prev) => prev.filter((p) => p.id !== property.id))
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir imóvel: ' + err.message)
    }
  }

  // --------------------------------------------------------
  // Renderização condicional: carregando / login / assinatura / app
  // --------------------------------------------------------

  // Prioridade máxima: se a pessoa clicou no link de recuperação de senha,
  // mostra a tela de definir nova senha, independente de qualquer outro estado.
  if (isPasswordRecovery) {
    return <ResetPasswordScreen />
  }

  if (session === undefined || (session && isLoadingProfile && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  // Admin sempre passa (tem acesso irrestrito ao app + painel)
  const subscriptionOk = isAdmin(profile) || hasActiveSubscription(profile)

  if (profile && !subscriptionOk) {
    return <SubscriptionGate profile={profile} />
  }

  // Aguarda a checagem do dispositivo antes de liberar o app
  if (profile && deviceStatus === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (profile && deviceStatus !== 'approved') {
    return <DeviceBlockedScreen status={deviceStatus} />
  }

  if (showAdminPanel) {
    return <AdminPanel onBack={() => setShowAdminPanel(false)} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fixo estilo app */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-[#0f172a] px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">ImobFlash</span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-md">
        {activeTab === 'new' && (
          <NewPropertyForm
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            brokerInfoComplete={hasBrokerInfo(profile)}
            onGoToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'list' && (
          <PropertyList
            properties={properties}
            isLoading={isLoadingProperties}
            onViewTexts={handleViewTexts}
            onCopyWhatsapp={handleCopyWhatsapp}
            onDelete={handleDelete}
          />
        )}

        {activeTab === 'referral' && <ReferralSection profile={profile} />}

        {activeTab === 'profile' && (
          <ProfileScreen
            profile={profile}
            onOpenAdmin={() => setShowAdminPanel(true)}
            onProfileUpdated={setProfile}
          />
        )}
      </main>

      {/* Navegação inferior */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modal de resultados da IA */}
      {modalTexts && (
        <AIResultsModal
          texts={modalTexts}
          onClose={closeModal}
          onSave={handleSaveProperty}
          isSaving={isSaving}
          saved={saved}
          readOnly={modalReadOnly}
          brokerPhone={profile?.broker_phone}
        />
      )}
    </div>
  )
}
