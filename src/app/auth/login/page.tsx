'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signInWithState } from '@/app/actions/auth'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            type="submit"
        >
            {pending ? 'Memproses...' : 'Masuk'}
        </button>
    )
}

export default function LoginPage() {
    const [state, formAction] = useActionState(signInWithState, { error: null })

    return (
        <main className="flex min-h-dvh items-center justify-center bg-lightprimary px-4 py-8">
            <section
                aria-labelledby="login-heading"
                className="w-full max-w-md rounded-md border border-border bg-background p-6 shadow-sm sm:p-8"
            >
                <div className="mb-7">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Guruku
                    </p>
                    <h1
                        className="text-2xl font-semibold text-foreground"
                        id="login-heading"
                    >
                        Masuk ke ruang kerja
                    </h1>
                </div>

                <form action={formAction} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="email">
                            Email
                        </label>
                        <input
                            autoComplete="email"
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            id="email"
                            name="email"
                            type="email"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="password">
                            Kata sandi
                        </label>
                        <input
                            autoComplete="current-password"
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            id="password"
                            name="password"
                            type="password"
                        />
                    </div>

                    {state.error ? (
                        <p aria-live="polite" className="text-sm text-destructive" role="alert">
                            {state.error}
                        </p>
                    ) : null}

                    <SubmitButton />
                </form>
            </section>
        </main>
    )
}