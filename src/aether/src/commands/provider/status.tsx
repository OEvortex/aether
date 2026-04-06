import chalk from 'chalk'
import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from '../../services/analytics/index.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { KnownProviders } from '../../../../../src/utils/knownProvidersData.js'
import { getCurrentSelection, getModelSelectionDisplayString, getAvailableProviders, persistSelectedModel } from '../../utils/model/modelSelection.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js'
import { Box, Text, useInput } from '../../ink.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Pane } from '../../components/design-system/Pane.js'
import { useSetAppState } from '../../state/AppState.js'

/** Simple fuzzy match: checks if all characters of the query appear in order in the target. */
function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

type ProviderEntry = {
  displayName: string
  models?: Array<{ id: string; name?: string }>
  fetchModels?: boolean
}

/** Find a provider by fuzzy matching on display name or ID */
function findProviderByFuzzyName(search: string): { id: string; displayName: string } | null {
  const entries = Object.entries(KnownProviders) as Array<[string, ProviderEntry]>
  const searchLower = search.toLowerCase()

  // Exact ID match first
  const exactMatch = (KnownProviders as Record<string, ProviderEntry>)[searchLower]
  if (exactMatch) {
    return { id: searchLower, displayName: exactMatch.displayName }
  }

  // Fuzzy match on display name (word-match: each word in search must appear in display name)
  for (const [id, config] of entries) {
    if (fuzzyMatch(searchLower, config.displayName)) {
      return { id, displayName: config.displayName }
    }
    // Also try word-level matching: all search words must appear in display name
    const searchWords = searchLower.split(/\s+/)
    const displayNameLower = config.displayName.toLowerCase()
    if (searchWords.every(word => displayNameLower.includes(word))) {
      return { id, displayName: config.displayName }
    }
  }

  // Fuzzy match on ID
  for (const [id, config] of entries) {
    if (fuzzyMatch(searchLower, id)) {
      return { id, displayName: config.displayName }
    }
  }

  return null
}

function ProviderStatus({ onDone }: { onDone: (message: string, options?: { display?: CommandResultDisplay }) => void }): React.ReactNode {
  const currentSelection = getCurrentSelection()
  const apiProvider = getAPIProvider()

  const statusLines: string[] = []

  statusLines.push(chalk.bold('Current Provider & Model Status'))
  statusLines.push('')

  if (currentSelection.isDefault) {
    statusLines.push(`Model: ${chalk.green('Default')} (using system defaults)`)
  } else {
    statusLines.push(`Model: ${chalk.green(getModelSelectionDisplayString(currentSelection.modelString))}`)
  }

  statusLines.push(`API Provider: ${chalk.green(apiProvider)}`)

  if (currentSelection.provider) {
    statusLines.push(`Selected Provider: ${chalk.green(currentSelection.provider)}`)
  }

  statusLines.push('')
  statusLines.push(chalk.bold('Available Providers'))
  statusLines.push('')

  const providers = getAvailableProviders()

  for (const provider of providers) {
    const isActive = provider.id === currentSelection.provider
    const marker = isActive ? chalk.green('►') : ' '
    const modelsInfo = provider.modelCount > 0
      ? `${provider.modelCount} model${provider.modelCount > 1 ? 's' : ''}`
      : 'dynamic model fetching'

    statusLines.push(`${marker} ${chalk.cyan(provider.displayName)}`)
    statusLines.push(chalk.dim(`    ${modelsInfo}`))
  }

  statusLines.push('')
  statusLines.push(chalk.dim('Use /model to change the active model'))
  statusLines.push(chalk.dim('Use /provider setup to configure a new provider'))

  onDone(statusLines.join('\n'), { display: 'system' })
  return null
}

function ProviderList({ onDone }: { onDone: (message: string, options?: { display?: CommandResultDisplay }) => void }): React.ReactNode {
  const currentSelection = getCurrentSelection()

  const lines: string[] = []

  lines.push(chalk.bold('Available Providers'))
  lines.push('')

  const providers = getAvailableProviders()

  for (const provider of providers) {
    const isActive = provider.id === currentSelection.provider
    const marker = isActive ? chalk.green('►') : ' '
    const modelsCount = provider.modelCount
    const modelName = modelsCount > 0 ? `${modelsCount} models` : 'dynamic'

    lines.push(`${marker} ${chalk.cyan(provider.displayName)} ${chalk.dim(`(${provider.id})`)}`)
    lines.push(chalk.dim(`    ${modelName}`))

    if (isActive && currentSelection.modelString) {
      lines.push(chalk.dim(`    Current: ${getModelSelectionDisplayString(currentSelection.modelString)}`))
    }
  }

  if (providers.length === 0) {
    lines.push(chalk.yellow('No providers configured'))
  }

  onDone(lines.join('\n'), { display: 'system' })
  return null
}

function ProviderSet({ args, onDone }: { args: string; onDone: (message: string, options?: { display?: CommandResultDisplay }) => void }): React.ReactNode {
  const setAppState = useSetAppState()
  logEvent('tengu_provider_command_set', {
    args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  // If args provided, use direct selection with fuzzy matching
  if (args.trim()) {
    const match = findProviderByFuzzyName(args.trim())
    if (!match) {
      const availableIds = Object.values(KnownProviders as Record<string, ProviderEntry>).map(p => p.displayName).join(', ')
      onDone(
        `Unknown provider: ${chalk.red(args)}\n` +
          `Available providers: ${availableIds}`,
        { display: 'system' }
      )
      return null
    }

    const providerId = match.id
    const knownProvider = (KnownProviders as Record<string, ProviderEntry>)[providerId]

    if (knownProvider.models && knownProvider.models.length > 0) {
      const firstModel = knownProvider.models[0]
      persistSelectedModel(providerId, firstModel.id)
      setAppState(prev => ({ ...prev, activeProvider: providerId }))
      onDone(
        `Set provider to ${chalk.green(knownProvider.displayName)} with model ${chalk.green(firstModel.name)}`,
        { display: 'system' }
      )
    } else if (knownProvider.fetchModels) {
      persistSelectedModel(providerId, '')
      setAppState(prev => ({ ...prev, activeProvider: providerId }))
      onDone(
        `Set provider to ${chalk.green(knownProvider.displayName)} ${chalk.dim('(models will be fetched dynamically)')}`,
        { display: 'system' }
      )
    } else {
      setAppState(prev => ({ ...prev, activeProvider: providerId }))
      onDone(`Set provider to ${chalk.green(knownProvider.displayName)}`, { display: 'system' })
    }
    return null
  }

  // No args - show interactive picker
  return <ProviderSetPicker onDone={onDone} />
}

function ProviderSetPicker({ onDone }: { onDone: (message: string, options?: { display?: CommandResultDisplay }) => void }): React.ReactNode {
  const currentSelection = getCurrentSelection()
  const exitState = useExitOnCtrlCDWithKeybindings()
  const setAppState = useSetAppState()
  const [searchQuery, setSearchQuery] = useState('')

  // Build provider options from KnownProviders
  const providerOptions = useMemo(() => {
    const entries = Object.entries(KnownProviders) as Array<[string, ProviderEntry]>
    return entries.map(([id, config]) => ({
      id,
      displayName: config.displayName,
      hasModels: (config.models?.length ?? 0) > 0,
      modelCount: config.models?.length ?? 0,
      fetchModels: config.fetchModels,
    })).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [])

  // Filter by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return providerOptions
    return providerOptions.filter(opt =>
      fuzzyMatch(searchQuery, opt.displayName) || fuzzyMatch(searchQuery, opt.id)
    )
  }, [searchQuery, providerOptions])

  // Select options for CustomSelect
  const selectOptions = useMemo(() => {
    const searchOption = {
      type: 'input' as const,
      label: searchQuery ? `🔍 ${searchQuery} (Esc to reset focus)` : '🔍 Type to search providers...',
      value: '__SEARCH__',
      placeholder: 'Search providers...',
      initialValue: searchQuery,
      onChange: (v: string) => setSearchQuery(v),
      allowEmptySubmitToCancel: true,
    }

    const options = filteredOptions.map(opt => {
      const isActive = opt.id === currentSelection.provider
      const suffix = isActive ? ' (current)' : ''
      const modelsInfo = opt.modelCount > 0
        ? `${opt.modelCount} models`
        : opt.fetchModels
          ? 'dynamic model fetching'
          : 'no models'

      return {
        type: 'text' as const,
        label: opt.displayName,
        description: `${modelsInfo}${suffix}`,
        value: opt.id,
      }
    })

    return [searchOption, ...options]
  }, [filteredOptions, currentSelection.provider, searchQuery])

  const initialFocusValue = '__SEARCH__'
  const visibleCount = Math.min(10, selectOptions.length)

  const handleSelect = useCallback((selectedProviderId: string | null | undefined) => {
    if (!selectedProviderId || selectedProviderId === '__SEARCH__') {
      return // Ignore search input or null selection
    }

    const knownProvider = (KnownProviders as Record<string, ProviderEntry>)[selectedProviderId]
    if (!knownProvider) {
      onDone(`Set provider to ${chalk.cyan(selectedProviderId)}`, { display: 'system' })
      return
    }

    if (knownProvider.models && knownProvider.models.length > 0) {
      const firstModel = knownProvider.models[0]
      persistSelectedModel(selectedProviderId, firstModel.id)
      setAppState(prev => ({ ...prev, activeProvider: selectedProviderId }))
      onDone(
        `Set provider to ${chalk.green(knownProvider.displayName)} with model ${chalk.green(firstModel.name)}`,
        { display: 'system' }
      )
    } else if (knownProvider.fetchModels) {
      persistSelectedModel(selectedProviderId, '')
      setAppState(prev => ({ ...prev, activeProvider: selectedProviderId }))
      onDone(
        `Set provider to ${chalk.green(knownProvider.displayName)} ${chalk.dim('(models will be fetched dynamically)')}`,
        { display: 'system' }
      )
    } else {
      setAppState(prev => ({ ...prev, activeProvider: selectedProviderId }))
      onDone(`Set provider to ${chalk.green(knownProvider.displayName)}`, { display: 'system' })
    }
  }, [onDone, setAppState])

  const handleCancel = useCallback(() => {
    logEvent('tengu_provider_command_set_cancel', {})
    onDone('Provider selection cancelled', { display: 'system' })
  }, [onDone])

  // Capture printable text for fuzzy search when not in the search input
  useInput(useCallback((input: string, key: any) => {
    // Ignore backspace/escape for clearing search
    if (key.backspace || key.escape) {
      setSearchQuery('')
      return
    }
    // Capture printable characters for fuzzy search
    if (input && input.length === 1 && input >= ' ' && input <= '~' && !key.ctrl && !key.meta) {
      setSearchQuery(prev => prev + input)
    }
  }, []))

  return React.createElement(
    Pane,
    { color: 'permission' },
    React.createElement(Box, { flexDirection: 'column', paddingX: 2, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'remember' }, 'Select Provider'),
      React.createElement(Text, { dimColor: true }, 'Type to filter · Arrow keys to navigate · Enter to select · Esc to cancel'),
      React.createElement(Select, {
        options: selectOptions,
        defaultValue: undefined,
        defaultFocusValue: initialFocusValue,
        onChange: handleSelect,
        onCancel: handleCancel,
        visibleOptionCount: visibleCount,
      }),
      filteredOptions.length < providerOptions.length && searchQuery
        ? React.createElement(Box, { marginTop: 1, paddingLeft: 3 },
            React.createElement(Text, { dimColor: true }, `${filteredOptions.length} of ${providerOptions.length} providers`),
          )
        : null,
      React.createElement(Text, { dimColor: true, italic: true }, `Press ${exitState.keyName ?? 'Ctrl+C'} again to exit`),
    ),
  )
}

function ProviderSetup(_props: { onDone: (message: string, options?: { display?: CommandResultDisplay }) => void }): React.ReactNode {
  // Delegate to the existing provider wizard (provider.tsx)
  // biome-ignore lint/correctness/noCommonJs: dynamic require to avoid circular dependency
  const { call: providerWizardCall } = require('./provider.js')
  return providerWizardCall(_props.onDone, {} as any, '')
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  args = args?.trim() || ''

  if (!args) {
    // Default: open interactive provider picker (like /model)
    logEvent('tengu_provider_command_interactive', {})
    return React.createElement(ProviderSetPicker, { onDone })
  }

  if (COMMON_INFO_ARGS.includes(args)) {
    logEvent('tengu_provider_command_info', {})
    const currentSelection = getCurrentSelection()
    const infoLines: string[] = []
    infoLines.push(chalk.bold('Provider Information'))
    infoLines.push('')
    if (currentSelection.isDefault) {
      infoLines.push('Currently using: Default provider')
    } else {
      infoLines.push(`Currently using: ${getModelSelectionDisplayString(currentSelection.modelString)}`)
    }
    onDone(infoLines.join('\n'), { display: 'system' })
    return null
  }

  if (COMMON_HELP_ARGS.includes(args) || args === 'help') {
    logEvent('tengu_provider_command_help', {})
    onDone(
      `Provider management commands:\n\n` +
        `  /provider              - Open interactive provider picker\n` +
        `  /provider status       - Show current provider status\n` +
        `  /provider list         - List all available providers\n` +
        `  /provider set <name>   - Set active provider (fuzzy match by name)\n` +
        `  /provider setup        - Open detailed provider setup wizard\n\n` +
        `Examples:\n` +
        `  /provider\n` +
        `  /provider status\n` +
        `  /provider list\n` +
        `  /provider set Apertis AI\n` +
        `  /provider setup`,
      { display: 'system' }
    )
    return
  }

  // Handle subcommand
  const parts = args.split(/\s+/)
  const subcommand = parts[0]?.toLowerCase()
  const subcommandArgs = parts.slice(1).join(' ')

  switch (subcommand) {
    case 'list':
      logEvent('tengu_provider_command_list', {})
      return React.createElement(ProviderList, { onDone })

    case 'set': {
      // If args to set, use direct selection with fuzzy matching
      if (subcommandArgs.trim()) {
        return React.createElement(ProviderSet, { args: subcommandArgs, onDone })
      }
      // No args to set - show interactive picker
      return React.createElement(ProviderSetPicker, { onDone })
    }

    case 'status':
      logEvent('tengu_provider_command_status', {})
      return React.createElement(ProviderStatus, { onDone })

    case 'setup':
      logEvent('tengu_provider_command_setup', {})
      return ProviderSetup({ onDone })

    default:
      onDone(`Unknown provider subcommand: ${chalk.red(subcommand)}\n` +
             `Run /provider help for usage.`,
        { display: 'system' }
      )
      return null
  }
}
