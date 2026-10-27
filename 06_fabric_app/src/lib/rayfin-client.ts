// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import { RayfinClient } from "@microsoft/rayfin-client";

let _client: RayfinClient | undefined;

/**
 * Renvoie le client Rayfin unique de l'application.
 */
export function getRayfinClient(): RayfinClient {
    if (!_client) {
        const apiUrl = import.meta.env.VITE_RAYFIN_API_URL;
        const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;

        if (!apiUrl || !publishableKey) {
            throw new Error(`Variables d'environnement Rayfin absentes : lancez 'npx rayfin up'`);
        }

        _client = new RayfinClient({
            baseUrl: apiUrl,
            publishableKey,
            authStorage: true,
            useProxy: false,
        });
    }

    return _client;
}