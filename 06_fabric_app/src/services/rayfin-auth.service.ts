// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import RayfinClient from "@microsoft/rayfin-client";
import type { OpaqueSession } from "@microsoft/rayfin-auth";
import {
    initEmbeddedAuth as sdkInitEmbeddedAuth,
    type FabricAuthOptions,
} from "@microsoft/rayfin-auth-provider-fabric";
import { getRayfinClient } from "@/lib/rayfin-client";

export interface IAuthService {
    /**
     * Tente d'obtenir une session par l'authentification intégrée à Fabric,
     * sans interface. Renvoie `null` hors de Fabric : {@link AuthGate}
     * affiche alors l'invitation à ouvrir l'application depuis Fabric.
     */
    initEmbeddedAuth(): Promise<OpaqueSession | null>;
}

/**
 * Lit les variables `VITE_*` et construit le service d'authentification.
 *
 * Appelé par `main.tsx` avant le montage de React. S'il manque une variable,
 * l'application ne démarre pas : sans configuration Rayfin ni Fabric, elle
 * n'a rien à afficher.
 *
 * Variables requises (écrites par `npx rayfin up`) :
 * - `VITE_RAYFIN_API_URL` : adresse de l'API Rayfin
 * - `VITE_RAYFIN_PUBLISHABLE_KEY` : clé publique Rayfin (`pk-...`)
 * - `VITE_FABRIC_WORKSPACE_ID` : identifiant de l'espace de travail Fabric
 * - `VITE_FABRIC_ITEM_ID` : identifiant de l'élément Fabric
 * - `VITE_FABRIC_PORTAL_URL` : adresse du portail Fabric
 */
export function bootstrapAuth(): IAuthService {
    const client = getRayfinClient();

    const workspaceId = import.meta.env.VITE_FABRIC_WORKSPACE_ID;
    const projectId = import.meta.env.VITE_FABRIC_ITEM_ID;
    const fabricPortalUrl = import.meta.env.VITE_FABRIC_PORTAL_URL;

    if (
        !workspaceId ||
        !projectId ||
        !fabricPortalUrl
    ) {
        throw new Error(`Variables d'environnement Fabric absentes : lancez 'npx rayfin up'`);
    }

    const fabricOptions: FabricAuthOptions = {
        workspaceId,
        projectId,
        fabricPortalUrl,
        returnOrigin: window.location.origin,
    };

    return new RayfinAuthService(client, fabricOptions);
}

/**
 * Service d'authentification qui s'appuie sur le kit Fabric
 * (`@microsoft/rayfin-auth-provider-fabric`).
 */
class RayfinAuthService implements IAuthService {
    constructor(
        private readonly client: RayfinClient,
        private readonly fabricOptions: FabricAuthOptions,
    ) {}

    async initEmbeddedAuth(): Promise<OpaqueSession | null> {
        return sdkInitEmbeddedAuth(this.client.auth, this.fabricOptions);
    }
}