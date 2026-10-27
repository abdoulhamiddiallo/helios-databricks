// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { OpaqueSession } from "@microsoft/rayfin-auth";

import { IAuthService } from "@/services/rayfin-auth.service";
import { AuthContext, type AuthContextValue } from "./auth.context";

interface AuthProviderProps {
    children: ReactNode;
    rayfinAuthService: IAuthService;
}

/**
 * AuthProvider : lance une seule fois, au démarrage, l'authentification intégrée à Fabric.
 *
 * - Ouverte dans Fabric (`?fabricEmbedded=true`), l'application obtient une session
 *   Rayfin par `initEmbeddedAuth`, au moyen de messages échangés avec le portail.
 * - Ouverte seule, `initEmbeddedAuth` renvoie `null` : personne n'est connecté et
 *   `<AuthGate>` affiche l'invitation à ouvrir HÉLIOS depuis Fabric.
 *
 * La session se lit ensuite avec le hook `useAuth`.
 */
export function AuthProvider({ children, rayfinAuthService }: AuthProviderProps) {
    const [session, setSession] = useState<OpaqueSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const result = await rayfinAuthService.initEmbeddedAuth();
                if (cancelled)
                    return;
                setSession(result);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [rayfinAuthService]);

    if (error)
        throw error;

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            isAuthenticated: session?.isAuthenticated ?? false,
            isLoading,
            error,
        }),
        [session, isLoading, error],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}