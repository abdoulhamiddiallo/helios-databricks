// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import { SemanticModelMessageClient } from "@microsoft/fabric-app-data-embed-client";
import { FabricClient, type FabricClientConfig } from "@microsoft/fabric-app-data";
import { EmbedFabricApiProxy } from "@microsoft/fabric-app-data-proxy";
import { fabricConfig } from "@/fabric.generated";
import { getFabricClientConfig, isFabricConfigured } from "@/config/fabric-config";

let _client: FabricClient | undefined;
let _messageClient: SemanticModelMessageClient | undefined;

/**
 * Renvoie le client Fabric unique de l'application.
 *
 * Il est construit une seule fois avec :
 * - un EmbedFabricApiProxy, qui dialogue avec le portail Fabric par messages ;
 * - les alias de connexion de `fabric.generated.ts` (générés par `npx fabric-app-data`) ;
 * - la configuration lue dans les variables d'environnement.
 *
 * Utilisé par `helios-data.ts` pour exécuter les requêtes DAX.
 */
export function getFabricClient(): FabricClient {
    if (!_messageClient) {
        _messageClient = new SemanticModelMessageClient();
    }

    if (!_client) {
        if (!isFabricConfigured()) {
            throw new Error('Client Fabric non configuré : définissez VITE_FABRIC_WORKSPACE_ID, VITE_FABRIC_ITEM_ID et VITE_FABRIC_TENANT_ID pour interroger le modèle sémantique.');
        }

        const proxy = new EmbedFabricApiProxy(_messageClient);
        const runtimeConfig = getFabricClientConfig();
        _client = new FabricClient({ ...fabricConfig, ...runtimeConfig, proxy } as FabricClientConfig);
    }

    return _client;
}
