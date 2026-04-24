export type ProviderType = 'openai-compatible' | 'google-ai-studio' | 'xai'
export type EndpointType = 'chat/completions' | 'responses'
export type TargetId = 'openclaude' | 'openclaw' | 'vscode-openclaude'
export type RotationStrategy = 'fill-first' | 'round-robin'

export interface GatewayServerConfig {
  host?: string
  port?: number
  masterKey?: string
  dashboardPort?: number
  rotation?: RotationStrategy
}

export interface SpendLimit {
  dailyUsd?: number
  monthlyUsd?: number
}

export interface ScheduleWindow {
  fromHour: number
  toHour: number
}

export interface ProviderProfile {
  type: ProviderType
  model: string
  aliases?: string[]
  apiKeys: string[]
  baseUrl?: string
  headers?: Record<string, string>
  supportedEndpoints?: EndpointType[]
  cooldowns?: Partial<Record<string, number>>
  spendLimit?: SpendLimit
  schedule?: ScheduleWindow
  costPer1MInputTokens?: number
  costPer1MOutputTokens?: number
}

export interface GatewayConfig {
  server?: GatewayServerConfig
  routes: { default: string }
  providers: Record<string, ProviderProfile>
}

export interface DetectionPaths {
  homeDir: string
  cwd?: string
}

export interface DetectedTarget {
  id: TargetId
  label: string
  configPath?: string
  exists: boolean
  notes: string[]
}

export interface InstallOptions {
  configPath: string
  target: TargetId
  targetPath?: string
  launcherPath?: string
}

export interface InstallResult {
  target: TargetId
  updatedFiles: string[]
  notes: string[]
}

export interface KeyStats {
  providerId: string
  keyPreview: string
  requests: number
  inputTokens: number
  outputTokens: number
  estimatedUsdToday: number
  estimatedUsdMonth: number
  errors: number
  lastUsed: number | null
  status: 'active' | 'cooldown' | 'spend-limit' | 'schedule-off'
  unavailableUntil?: number
}

export interface ProviderStats {
  id: string
  model: string
  keys: KeyStats[]
  totalRequests: number
  totalErrors: number
  estimatedUsdToday: number
  estimatedUsdMonth: number
  scheduleActive: boolean
  spendLimitReached: boolean
}

// ── Multi-instance types ──────────────────────────────────────────────────────

/** Uma instância individual no arquivo openrat.multi.json */
export interface MultiInstance {
  /** Nome identificador da instância, ex: "rat-1", "codex-key" */
  name: string
  /** Porta do gateway. Se omitida, será auto-calculada a partir de basePort */
  port?: number
  /** Porta do dashboard. Se omitida, será gateway + 1 */
  dashboardPort?: number
  /** Chave mestre para este gateway (padrão: "openrat-local") */
  masterKey?: string
  /** Estratégia de rotação de chaves */
  rotation?: RotationStrategy
  /** Providers desta instância */
  providers: Record<string, ProviderProfile>
  /** Rota padrão */
  routes: { default: string }
}

/** Arquivo openrat.multi.json */
export interface MultiConfig {
  /** Porta base para auto-numeração. Padrão: 4419 */
  basePort?: number
  /** Instâncias a subir */
  instances: MultiInstance[]
}

/** Status de uma instância em execução */
export interface InstanceStatus {
  name: string
  port: number
  dashboardPort: number
  pid: number
  status: 'running' | 'stopped' | 'error'
  startedAt: number
  errorMessage?: string
}
