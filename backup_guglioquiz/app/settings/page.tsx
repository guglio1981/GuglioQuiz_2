'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { createGame, addPlayer, getGameByCode, updateGameSettings, updateGameStatus } from '@/lib/game-store'
import { TOPICS, TOPIC_LABELS, type Topic, type Difficulty, type GameSettings, type PlayerProfile } from '@/lib/types'
import { toast } from 'sonner'
import { ArrowLeft, Shuffle, Settings2, Loader2 } from 'lucide-react'

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [existingGameCode, setExistingGameCode] = useState<string | null>(null)
  const [isMancheMode, setIsMancheMode] = useState(false)
  
  // Settings state
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([])
  const [mixMode, setMixMode] = useState(false)
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [difficulty, setDifficulty] = useState<Difficulty>('intermedia')
  const [maxAbstentions, setMaxAbstentions] = useState<number>(3)

  useEffect(() => {
    const storedProfile = sessionStorage.getItem('guglioquiz_profile')
    const isHost = sessionStorage.getItem('guglioquiz_isHost')

    if (!storedProfile || isHost !== 'true') {
      router.push('/')
      return
    }

    setProfile(JSON.parse(storedProfile))
    
    // Check if this is a new manche
    const codeParam = searchParams.get('code')
    const mancheParam = searchParams.get('manche')
    
    if (codeParam && mancheParam === 'true') {
      setExistingGameCode(codeParam)
      setIsMancheMode(true)
    }
  }, [router, searchParams])

  const handleTopicToggle = (topic: Topic) => {
    if (mixMode) return
    
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    )
  }

  const handleMixToggle = () => {
    setMixMode(!mixMode)
    if (!mixMode) {
      setSelectedTopics([...TOPICS])
    } else {
      setSelectedTopics([])
    }
  }

  const handleCreateGame = async () => {
    if (!profile) return

    const topics = mixMode ? [...TOPICS] : selectedTopics
    if (topics.length === 0) {
      toast.error('Seleziona almeno un argomento')
      return
    }

    setIsLoading(true)

    const settings: GameSettings = {
      topics,
      questionCount,
      difficulty,
      maxAbstentions,
    }

    // If this is a new manche, update existing game settings
    if (isMancheMode && existingGameCode) {
      const existingGame = await getGameByCode(existingGameCode)
      if (!existingGame) {
        toast.error('Partita non trovata')
        setIsLoading(false)
        return
      }

      const updated = await updateGameSettings(existingGame.id, settings)
      if (!updated) {
        toast.error('Errore durante l\'aggiornamento delle impostazioni')
        setIsLoading(false)
        return
      }

      await updateGameStatus(existingGame.id, 'lobby')
      window.location.href = `/lobby/${existingGameCode}`
      return
    }

    // Create new game
    const tempHostId = crypto.randomUUID()
    const game = await createGame(tempHostId, settings)

    if (!game) {
      toast.error('Errore durante la creazione della partita')
      setIsLoading(false)
      return
    }

    // Add host as player
    const player = await addPlayer(
      game.id,
      profile.name,
      profile.avatar,
      profile.avatarUrl,
      true
    )

    if (!player) {
      toast.error('Errore durante la registrazione')
      setIsLoading(false)
      return
    }

    // Store session info
    sessionStorage.setItem('guglioquiz_playerId', player.id)
    sessionStorage.setItem('guglioquiz_gameId', game.id)

    window.location.href = `/lobby/${game.code}`
  }

  if (!profile) {
    return null
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isMancheMode ? 'Nuova Manche' : 'Impostazioni Partita'}
            </h1>
            <p className="text-muted-foreground">
              {isMancheMode ? 'Configura le impostazioni per la nuova manche' : 'Configura le regole del quiz'}
            </p>
          </div>
        </div>

        {/* Topics */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Settings2 className="h-5 w-5 text-primary" />
              Argomenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mix mode toggle */}
            <Button
              onClick={handleMixToggle}
              variant={mixMode ? 'default' : 'outline'}
              className="w-full justify-start"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Mix - Tutti gli argomenti
            </Button>

            {/* Individual topics */}
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((topic) => (
                <div
                  key={topic}
                  onClick={() => handleTopicToggle(topic)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${mixMode ? 'opacity-50 cursor-not-allowed' : ''}
                    ${selectedTopics.includes(topic) && !mixMode
                      ? 'bg-primary/20 border-primary'
                      : 'bg-muted border-border hover:border-primary/50'
                    }
                  `}
                >
                  <Checkbox
                    checked={selectedTopics.includes(topic) || mixMode}
                    disabled={mixMode}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-sm text-foreground">{TOPIC_LABELS[topic]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Question count */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Numero di domande</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={questionCount.toString()}
              onValueChange={(v) => setQuestionCount(parseInt(v))}
              className="flex flex-wrap gap-3"
            >
              {[5, 10, 15, 20, 25].map((count) => (
                <div key={count} className="flex items-center">
                  <RadioGroupItem
                    value={count.toString()}
                    id={`count-${count}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`count-${count}`}
                    className="flex items-center justify-center w-14 h-14 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:bg-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary-foreground bg-muted border-border text-foreground hover:border-primary/50"
                  >
                    {count}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Difficulty */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Difficolta</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
              className="flex gap-4"
            >
              <div className="flex-1">
                <RadioGroupItem
                  value="intermedia"
                  id="diff-intermedia"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="diff-intermedia"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:bg-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary-foreground bg-muted border-border text-foreground hover:border-primary/50"
                >
                  <span className="font-bold">Intermedia</span>
                  <span className="text-xs opacity-70">Per tutti</span>
                </Label>
              </div>
              <div className="flex-1">
                <RadioGroupItem
                  value="difficile"
                  id="diff-difficile"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="diff-difficile"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:bg-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary-foreground bg-muted border-border text-foreground hover:border-primary/50"
                >
                  <span className="font-bold">Difficile</span>
                  <span className="text-xs opacity-70">Per esperti</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Abstentions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Astensioni consentite</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={maxAbstentions.toString()}
              onValueChange={(v) => setMaxAbstentions(parseInt(v))}
              className="flex gap-4"
            >
              {[0, 3, 5].map((count) => (
                <div key={count} className="flex-1">
                  <RadioGroupItem
                    value={count.toString()}
                    id={`abs-${count}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`abs-${count}`}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:bg-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary-foreground bg-muted border-border text-foreground hover:border-primary/50"
                  >
                    <span className="font-bold">{count}</span>
                    <span className="text-xs opacity-70">
                      {count === 0 ? 'Nessuna' : `Max ${count}`}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-3">
              Dopo le astensioni consentite, ogni astensione conta come risposta errata
            </p>
          </CardContent>
        </Card>

        {/* Create button */}
        <Button
          onClick={handleCreateGame}
          disabled={isLoading || (!mixMode && selectedTopics.length === 0)}
          size="lg"
          className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading 
            ? (isMancheMode ? 'Aggiornamento...' : 'Creazione in corso...') 
            : (isMancheMode ? 'Avvia Nuova Manche' : 'Crea Partita')
          }
        </Button>
      </div>
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </main>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SettingsPageContent />
    </Suspense>
  )
}
