/**
 * Model selection persistence for Aether CLI
 * Saves and retrieves the selected model (with provider context) from settings
 * Uses provider::model format throughout
 */

import type { ModelSetting } from './model.js'
import {
  parseProviderModelId,
  isProviderQualifiedModel,
  extractProviderFromModelString,
  formatProviderModelId,
} from './providerModelFormat.js'
import { getSettings_DEPRECATED, updateSettingsForSource } from '../settings/settings.js'
import type { SettingsJson } from '../settings/types.js'
import { getAPIProvider } from './providers.js'
import { getMainLoopModelOverride, setMainLoopModelOverride } from '../../bootstrap/state.js'

// KnownProviders from the shared data file
// biome-ignore lint/correctness/noUnusedImports: type import used via KnownProviders indexing
import * as knownProvidersData from '../../../../../src/utils/knownProvidersData.js'

/**
 * Keys used to persist model selection across sessions
 * stored in user settings JSON
 */
const SETTINGS_SELECTED_MODEL = 'selectedModel'
const SETTINGS_SELECTED_PROVIDER = 'selectedProvider'

/**
 * Get KnownProviders config by ID from the shared data source
 */
function getKnownProviderConfig(id: string) {
  const data = knownProvidersData as { KnownProviders: Record<string, { displayName?: string; models?: Array<{ id: string; name?: string; model?: string }>; fetchModels?: boolean }> }
  return data.KnownProviders?.[id]
}

/**
 * Available providers list from KnownProviders
 */
function getKnownProvidersList(): Array<{ id: string; displayName: string; modelCount: number; hasModels: boolean; fetchModels?: boolean }> {
  const data = knownProvidersData as { KnownProviders: Record<string, { displayName?: string; models?: Array<unknown>; fetchModels?: boolean }> }
  const entries = Object.entries(data.KnownProviders || {})
  return entries.map(([id, config]) => ({
    id,
    displayName: config.displayName || id,
    modelCount: (config.models?.length ?? 0),
    hasModels: (config.models?.length ?? 0) > 0,
    fetchModels: config.fetchModels,
  })).sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/**
 * Save the selected model to persistent storage (settings JSON)
 * Saves both the provider and model for context-aware restoration
 * Also applies the model to the current session via mainLoopModelOverride
 */
export function persistSelectedModel(
  provider: string | undefined,
  model: string,
): void {
  const modelString = formatProviderModelId(provider, model)

  // Update in-memory Bootstrap state for current session
  setMainLoopModelOverride(modelString as ModelSetting)

  // Persist to settings for future sessions
  try {
    const providerToSave = provider ?? extractProviderFromModelString(model)
    if (providerToSave) {
      updateSettingsForSource('userSettings', {
        env: {
          [SETTINGS_SELECTED_PROVIDER]: providerToSave,
          [SETTINGS_SELECTED_MODEL]: modelString,
        } as unknown as SettingsJson['env'],
      } as unknown as SettingsJson)
    } else {
      updateSettingsForSource('userSettings', {
        env: {
          [SETTINGS_SELECTED_MODEL]: modelString,
        } as unknown as SettingsJson['env'],
      } as unknown as SettingsJson)
    }
  } catch {
    // Persist failures should not break the user experience
    // Log silently but still apply the model to current session
  }
}

/**
 * Get the currently selected model from storage
 * Priority: mainLoopModelOverride > settings.selectedModel > env vars
 */
export function getCurrentSelection(): {
  provider: string | undefined
  model: string
  modelString: string
  isDefault: boolean
} {
  // Check current session override first
  const override = getMainLoopModelOverride()
  if (override !== undefined) {
    const parsed = parseProviderModelId(String(override))
    return {
      provider: parsed.provider ?? extractProviderFromModelString(parsed.model),
      model: parsed.model,
      modelString: String(override),
      isDefault: false,
    }
  }

  // Check persistent settings
  const settings = getSettings_DEPRECATED()
  const settingsModel = (settings as Record<string, unknown>)?.[SETTINGS_SELECTED_MODEL] as string | undefined

  if (settingsModel) {
    const parsed = parseProviderModelId(settingsModel)
    return {
      provider: parsed.provider ?? extractProviderFromModelString(parsed.model),
      model: parsed.model,
      modelString: settingsModel,
      isDefault: false,
    }
  }

  // Check environment variable (provider-specific)
  const apiProvider = getAPIProvider()
  const envModelMap: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_MODEL,
    openai: process.env.OPENAI_MODEL,
    codex: process.env.OPENAI_MODEL,
    firstParty: process.env.ANTHROPIC_MODEL,
  }
  const envModel = envModelMap[apiProvider]
  if (envModel) {
    return {
      provider: apiProvider === 'firstParty' ? undefined : apiProvider,
      model: envModel,
      modelString: envModel,
      isDefault: false,
    }
  }

  // No custom selection - using system default
  return {
    provider: undefined,
    model: '',
    modelString: '',
    isDefault: true,
  }
}

/**
 * Clear the saved model selection from persistent storage
 */
export function clearSelectedModel(): void {
  try {
    updateSettingsForSource('userSettings', {
      env: {
        [SETTINGS_SELECTED_MODEL]: undefined,
        [SETTINGS_SELECTED_PROVIDER]: undefined,
      } as unknown as SettingsJson['env'],
    } as unknown as SettingsJson)
    setMainLoopModelOverride(null)
  } catch {
    // Silently ignore
  }
}

/**
 * Get display label for a model selection
 * Shows "provider::model" when provider is known, otherwise just model name
 */
export function getModelSelectionDisplayString(modelString: string | null): string {
  if (!modelString) return 'Default'

  const parsed = parseProviderModelId(modelString)

  // If model string doesn't have explicit provider, try to detect it
  if (!parsed.provider) {
    const providers = getKnownProvidersList()
    for (const provider of providers) {
      const config = getKnownProviderConfig(provider.id)
      if (config?.models?.some(m => m.id === parsed.model || (m as { model?: string }).model === parsed.model)) {
        return formatProviderModelId(provider.id, parsed.model)
      }
    }
    return parsed.model
  }

  return parsed.display
}

/**
 * Validate that a provider::model combination is valid
 * Checks if the model exists in the specified provider's configuration
 */
export function validateProviderModelCombination(
  provider: string,
  model: string,
): boolean {
  const config = getKnownProviderConfig(provider)
  if (!config) {
    // Unknown provider - could be custom, allow it
    return true
  }

  if (!config.models || config.models.length === 0) {
    // Provider doesn't have predefined models, assume any model works
    return true
  }

  return config.models.some(
    m => m.id === model || (m as { model?: string }).model === model
  )
}

/**
 * Get available providers for display in TUI
 */
export function getAvailableProviders(): Array<{
  id: string
  displayName: string
  modelCount: number
  hasModels: boolean
  fetchModels?: boolean
}> {
  return getKnownProvidersList()
}
