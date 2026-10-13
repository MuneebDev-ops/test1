import { useEffect } from 'react'
import { useApp } from '../state/store'
import { Icon } from '../components/Icon'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { eyebrowClass } from '../components/chrome'

export function SignIn() {
  const { signIn } = useApp()

  useEffect(() => {
    document.title = 'Sign in · SentinelGuard'
  }, [])

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-sidebar text-white">
          <Icon name="shield" />
        </span>
        <p className={eyebrowClass}>Analyst console</p>
        <h1 className="font-serif text-5xl font-medium tracking-tight">SentinelGuard</h1>
        <p className="mt-3 mb-6 leading-relaxed text-muted-foreground">
          Synthetic environment for reviewing heuristic signals. Demo data only. No live financial decisions.
        </p>
        <Button className="w-full" onClick={signIn}>
          Continue as Maya Chen
        </Button>
      </Card>
    </main>
  )
}
