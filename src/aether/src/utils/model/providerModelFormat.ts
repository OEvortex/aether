/**
 * Model format utility for provider::model format
 * Parses and formats model identifiers with provider context
 * Used by /model command and ModelPicker component
 */

export interface ParsedModelId {
  /** Raw model identifier as entered by user */
  raw: string
  /** Provider extracted from provider::model format, or undefined */
  provider: string | undefined
  /** Model name (without provider prefix) */
  model: string
  /** Whether this uses the provider::model format */
  hasProvider: boolean
  /** Full display string in provider::model format */
  display: string
}

/**
 * Separator for provider::model format
 */
const PROVIDER_MODEL_SEPARATOR = '::'

/**
 * Parse a model identifier to extract provider and model components
 * Supports formats:
 * - "provider::model" (e.g., "deepseek::deepseek-chat")
 * - "model" (standalone model name)
 */
export function parseProviderModelId(raw: string): ParsedModelId {
  const separatorIndex = raw.indexOf(PROVIDER_MODEL_SEPARATOR)

  if (separatorIndex !== -1) {
    const provider = raw.substring(0, separatorIndex).trim()
    const model = raw.substring(separatorIndex + PROVIDER_MODEL_SEPARATOR.length).trim()
    return {
      raw,
      provider: provider || undefined,
      model: model || raw,
      hasProvider: true,
      display: `${provider}${PROVIDER_MODEL_SEPARATOR}${model}`,
    }
  }

  return {
    raw,
    provider: undefined,
    model: raw,
    hasProvider: false,
    display: raw,
  }
}

/**
 * Format a provider and model into the provider::model string format
 * If provider is undefined, returns just the model name
 */
export function formatProviderModelId(
  provider: string | undefined,
  model: string,
): string {
  if (!provider) return model
  return `${provider}${PROVIDER_MODEL_SEPARATOR}${model}`
}

/**
 * Check if a model string uses the provider::model format
 */
export function isProviderQualifiedModel(model: string | null): boolean {
  if (!model) return false
  return model.includes(PROVIDER_MODEL_SEPARATOR)
}

/**
 * Extract provider from a model string (returns undefined if not provider-qualified)
 */
export function extractProviderFromModelString(
  model: string | null,
): string | undefined {
  if (!model) return undefined
  const separatorIndex = model.indexOf(PROVIDER_MODEL_SEPARATOR)
  if (separatorIndex === -1) return undefined
  return model.substring(0, separatorIndex)
}

/**
 * Extract model name from a provider::model string
 * Returns the full string if not provider-qualified
 */
export function extractModelFromProviderString(
  model: string,
): string {
  const separatorIndex = model.indexOf(PROVIDER_MODEL_SEPARATOR)
  if (separatorIndex === -1) return model
  return model.substring(separatorIndex + PROVIDER_MODEL_SEPARATOR.length)
}
