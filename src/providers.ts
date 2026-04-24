import type { EndpointType, GatewayConfig, ProviderProfile } from './types.js'

export interface ResolvedProvider {
  id: string
  profile: ProviderProfile
}

export function resolveProvider(config: GatewayConfig, requestedModel?: string): ResolvedProvider {
  if (requestedModel) {
    for (const [providerId, profile] of Object.entries(config.providers)) {
      if (profile.aliases?.includes(requestedModel) || profile.model === requestedModel) {
        return { id: providerId, profile }
      }
    }
  }

  const fallback = config.providers[config.routes.default]
  return { id: config.routes.default, profile: fallback }
}

export function supportsEndpoint(profile: ProviderProfile, endpoint: EndpointType): boolean {
  return profile.supportedEndpoints?.includes(endpoint) ?? false
}

export function buildModelsPayload(config: GatewayConfig): { object: string; data: Array<Record<string, string>> } {
  const data = Object.entries(config.providers).map(([providerId, profile]) => ({
    id: profile.model,
    object: 'model',
    owned_by: providerId,
    provider: profile.type,
  }))

  return {
    object: 'list',
    data,
  }
}
