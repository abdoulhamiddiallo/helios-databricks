// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import { createContext, useContext } from "react";
import type { OpaqueSession } from "@microsoft/rayfin-auth";

export interface AuthContextValue {
    /** La session Rayfin en cours, ou `null` si personne n'est connecté. */
    session: OpaqueSession | null;
    /** Raccourci pour `session?.isAuthenticated ?? false`. */
    isAuthenticated: boolean;
    /** Vrai pendant l'échange d'authentification avec Fabric. */
    isLoading: boolean;
    /** Dernière erreur d'authentification, s'il y en a une. */
    error: Error | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }
    return context;
}
