'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, MinusCircle, Trophy } from 'lucide-react'

interface RulesDialogProps {
  open: boolean
  onAccept: () => void
  gameProfile?: 'timed' | 'untimed'
}

export function RulesDialog({ open, onAccept, gameProfile = 'timed' }: RulesDialogProps) {
  const isUntimed = gameProfile === 'untimed'

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-card border-border [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Punteggi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">Risposta corretta</p>
              <p className="text-sm text-muted-foreground">
                {isUntimed ? '+300 punti fissi' : '+200 a +300 punti in base alla velocita'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">Risposta errata</p>
              <p className="text-sm text-muted-foreground">
                {isUntimed ? '-150 punti fissi' : '-50 a -200 punti in base alla posizione'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <MinusCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">Astensione</p>
              <p className="text-sm text-muted-foreground">
                0 punti (numero limitato)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={onAccept} 
            size="lg"
            className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
