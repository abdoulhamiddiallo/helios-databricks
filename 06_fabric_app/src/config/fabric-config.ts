import { type FabricClientConfig } from '@microsoft/fabric-app-data';
import { fabricConfig as generatedFabricConfig } from '@/fabric.generated';

export interface FabricRuntimeConfig {
  workspaceId?: string;
  itemId?: string;
  tenantId?: string;
  portalUrl?: string;
  apiBaseUrl?: string;
  connectionAlias: string;
  isConfigured: boolean;
}

export function getFabricRuntimeConfig(): FabricRuntimeConfig {
  const workspaceId = import.meta.env.VITE_FABRIC_WORKSPACE_ID;
  const itemId = import.meta.env.VITE_FABRIC_ITEM_ID;
  const tenantId = import.meta.env.VITE_FABRIC_TENANT_ID;
  const portalUrl = import.meta.env.VITE_FABRIC_PORTAL_URL;
  const apiBaseUrl = import.meta.env.VITE_FABRIC_API_BASE_URL;
  const connectionAlias = import.meta.env.VITE_FABRIC_CONNECTION_ALIAS ?? 'helios';

  return {
    workspaceId,
    itemId,
    tenantId,
    portalUrl,
    apiBaseUrl,
    connectionAlias,
    isConfigured: Boolean(workspaceId && itemId && tenantId),
  };
}

export function getFabricClientConfig(): FabricClientConfig {
  const runtimeConfig = getFabricRuntimeConfig();
  return {
    ...generatedFabricConfig,
    workspaceId: runtimeConfig.workspaceId,
    projectId: runtimeConfig.itemId,
    tenantId: runtimeConfig.tenantId,
    portalUrl: runtimeConfig.portalUrl,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
  } as unknown as FabricClientConfig;
}

export function isFabricConfigured(): boolean {
  return getFabricRuntimeConfig().isConfigured;
}

export function getFabricConnectionAlias(): string {
  return getFabricRuntimeConfig().connectionAlias;
}
