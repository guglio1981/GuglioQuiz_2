'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)
    
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true
    setIsStandalone(standalone)
    
    // Show prompt only on iOS, not standalone, and if not dismissed before
    const dismissed = localStorage.getItem('guglioquiz_ios_prompt_dismissed')
    if (ios && !standalone && !dismissed) {
      // Delay showing to not interrupt initial experience
      setTimeout(() => setShowPrompt(true), 3000)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('guglioquiz_ios_prompt_dismissed', 'true')
  }

  if (!showPrompt || !isIOS || isStandalone) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom duration-300">
        <CardContent className="pt-6">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-3xl">
              GQ
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Installa GuglioQuiz</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Per ricevere le notifiche di invito alle partite su iPhone, installa l&apos;app sulla schermata home.
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-4 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Tocca</span>
                  <Share className="h-5 w-5 text-primary" />
                  <span>in basso</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Scorri e tocca</span>
                  <PlusSquare className="h-5 w-5 text-primary" />
                  <span>&quot;Aggiungi a Home&quot;</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <span className="text-sm">Tocca &quot;Aggiungi&quot; in alto a destra</span>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleDismiss} className="w-full">
              Ho capito
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
