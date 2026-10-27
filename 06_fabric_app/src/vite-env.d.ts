/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse de l'API Rayfin (par exemple http://localhost:5168). */
  readonly VITE_RAYFIN_API_URL?: string;
  /** Clé publique Rayfin (pk-...). */
  readonly VITE_RAYFIN_PUBLISHABLE_KEY?: string;
  /** Identifiant de l'espace de travail Fabric (FabricAuthOptions.workspaceId). */
  readonly VITE_FABRIC_WORKSPACE_ID?: string;
  /** Identifiant de l'élément Fabric (FabricAuthOptions.projectId). */
  readonly VITE_FABRIC_ITEM_ID?: string;
  /** Adresse du portail Fabric (par exemple https://app.fabric.microsoft.com/). */
  readonly VITE_FABRIC_PORTAL_URL?: string;
  /** Adresse de l'API Fabric (facultative), pour les scénarios intégrés ou par proxy. */
  readonly VITE_FABRIC_API_BASE_URL?: string;
  /** Alias de connexion du modèle sémantique (fabric.yaml). */
  readonly VITE_FABRIC_CONNECTION_ALIAS?: string;
  /** "1" pour un aperçu local avec des données de démonstration. */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare module "*.dax?raw" {
  const content: string;
  export default content;
}
