// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

export const ErrorFallback = ({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) => {
    const message = error instanceof Error ? error.message : String(error);

    // En développement, la pile complète part dans la console ;
    // le lecteur, lui, voit le message ci-dessous.
    if (import.meta.env.DEV) console.error("[ErrorBoundary]", error);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md text-center">
                <h2 className="mb-2 text-lg font-semibold text-foreground">Un incident est survenu</h2>
                <pre className="mb-4 max-h-32 overflow-auto rounded border border-border bg-muted p-3 text-left text-sm text-muted-foreground">
                    {message}
                </pre>
                <button
                    onClick={resetErrorBoundary}
                    className="rounded border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                    Réessayer
                </button>
            </div>
        </div>
    );
}
