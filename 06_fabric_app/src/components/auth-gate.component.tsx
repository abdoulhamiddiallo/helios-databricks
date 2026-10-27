// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import { type ReactNode } from "react";

import { useAuth } from "@/hooks/auth.context";

interface AuthGateProps {
    children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-sm text-muted-foreground">
                    Connexion à Microsoft Fabric…
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="w-full max-w-md text-center">
                    <h2 className="mb-2 text-lg font-semibold text-foreground">
                        Ouvrez HÉLIOS depuis Microsoft Fabric
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Cette application lit le modèle sémantique HELIOS avec vos droits Fabric : elle s'ouvre depuis l'espace de travail HELIOS, sur app.fabric.microsoft.com.
                    </p>
                </div>
            </div>
        );
    };
    
    return <>{children}</>;
}