import chalk from 'chalk'
import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { ModelPicker } from '../../components/ModelPicker.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from '../../services/analytics/index.js'
import { useAppState, useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import type { EffortLevel } from '../../utils/effort.js'
import { isBilledAsExtraUsage } from '../../utils/extraUsage.js'
import { clearFastModeCooldown, isFastModeAvailable, isFastModeEnabled, isFastModeSupportedByModel } from '../../utils/fastMode.js'
import { MODEL_ALIASES } from '../../utils/model/aliases.js'
import { checkOpus1mAccess, checkSonnet1mAccess } from '../../utils/model/check1mAccess.js'
import { getDefaultMainLoopModelSetting, isOpus1mMergeEnabled, renderDefaultModelSetting } from '../../utils/model/model.js'
import { isModelAllowed } from '../../utils/model/modelAllowlist.js'
import { validateModel } from '../../utils/model/validateModel.js'
import {
  parseProviderModelId,
  formatProviderModelId,
  isProviderQualifiedModel,
} from '../../utils/model/providerModelFormat.js'
import {
  persistSelectedModel,
  getCurrentSelection,
  getModelSelectionDisplayString,
  validateProviderModelCombination,
} from '../../utils/model/modelSelection.js'

function ModelPickerWrapper({
  onDone,
}: {
  onDone: (result?: string, options?: { display?: CommandResultDisplay }) => void
}): React.ReactNode {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const isFastMode = useAppState(s => s.fastMode)
  const setAppState = useSetAppState()

  function handleCancel() {
    logEvent('tengu_model_command_menu', {
      action: 'cancel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    const displayModel = renderModelLabel(mainLoopModel)
    onDone(`Kept model as ${chalk.bold(displayModel)}`, {
      display: 'system',
    })
  }

  function handleSelect(model: string | null, effort: EffortLevel | undefined) {
    logEvent('tengu_model_command_menu', {
      action: model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      from_model: mainLoopModel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      to_model: model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })

    let provider: string | undefined
    let modelName: string | null = model

    if (model && isProviderQualifiedModel(model)) {
      const parsed = parseProviderModelId(model)
      provider = parsed.provider
      modelName = parsed.model
    }

    setAppState(prev => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null,
    }))

    // Persist the model selection with provider context
    if (model) {
      persistSelectedModel(provider, modelName ?? model)
    }

    let message = `Set model to ${chalk.bold(renderModelLabel(model))}`
    if (effort !== undefined) {
      message = message + ` with ${chalk.bold(effort)} effort`
    }

    let wasFastModeToggledOn: boolean | undefined = undefined
    if (isFastModeEnabled()) {
      clearFastModeCooldown()
      if (!isFastModeSupportedByModel(model) && isFastMode) {
        setAppState(prev => ({
          ...prev,
          fastMode: false,
        }))
        wasFastModeToggledOn = false
      } else if (isFastModeSupportedByModel(model) && isFastModeAvailable() && isFastMode) {
        message = message + ' · Fast mode ON'
        wasFastModeToggledOn = true
      }
    }

    if (isBilledAsExtraUsage(model, wasFastModeToggledOn === true, isOpus1mMergeEnabled())) {
      message = message + ' · Billed as extra usage'
    }

    if (wasFastModeToggledOn === false) {
      message = message + ' · Fast mode OFF'
    }

    onDone(message)
  }

  const showFastModeNotice =
    isFastModeEnabled() &&
    isFastMode &&
    isFastModeSupportedByModel(mainLoopModel) &&
    isFastModeAvailable()

  return (
    <ModelPicker
      initial={mainLoopModel}
      sessionModel={mainLoopModelForSession}
      onSelect={handleSelect}
      onCancel={handleCancel}
      isStandaloneCommand={true}
      showFastModeNotice={showFastModeNotice}
    />
  )
}

function SetModelAndClose({
  args,
  onDone,
}: {
  args: string
  onDone: (result?: string, options?: { display?: CommandResultDisplay }) => void
}): React.ReactNode {
  const isFastMode = useAppState(s => s.fastMode)
  const setAppState = useSetAppState()
  const model = args === 'default' ? null : args

  React.useEffect(() => {
    async function handleModelChange(): Promise<void> {
      if (model && !isModelAllowed(model)) {
        onDone(`Model '${model}' is not available. Your organization restricts model selection.`, {
          display: 'system',
        })
        return
      }

      // Parse provider::model format if present
      const parsedModel = model ? parseProviderModelId(model) : null
      const actualModel = parsedModel ? parsedModel.model : model

      // Validate provider::model combination if provider specified
      if (parsedModel?.hasProvider && parsedModel.provider) {
        const isValid = validateProviderModelCombination(parsedModel.provider, parsedModel.model)
        if (!isValid && parsedModel.model) {
          onDone(`Model '${parsedModel.model}' is not available for provider '${parsedModel.provider}'.`, {
            display: 'system',
          })
          return
        }
      }

      // 1M context checks
      if (actualModel && isOpus1mUnavailable(actualModel)) {
        onDone(`Opus 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`, {
          display: 'system',
        })
        return
      }

      if (actualModel && isSonnet1mUnavailable(actualModel)) {
        onDone(`Sonnet 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`, {
          display: 'system',
        })
        return
      }

      // Skip validation for default model
      if (!model) {
        setModel(null)
        return
      }

      // Skip validation for known aliases (but actualModel may be null)
      if (actualModel && isKnownAlias(actualModel)) {
        setModel(model)
        return
      }

      // Validate and set custom model
      try {
        const { valid, error: error_0 } = await validateModel(actualModel ?? '')
        if (valid) {
          setModel(model)
        } else {
          onDone(error_0 || `Model '${model}' not found`, {
            display: 'system',
          })
        }
      } catch (error) {
        onDone(`Failed to validate model: ${(error as Error).message}`, {
          display: 'system',
        })
      }
    }

    function setModel(modelValue: string | null): void {
      setAppState(prev => ({
        ...prev,
        mainLoopModel: modelValue,
        mainLoopModelForSession: null,
      }))

      // Persist the model selection with provider context
      if (modelValue) {
        const parsed = parseProviderModelId(modelValue)
        persistSelectedModel(parsed.provider, parsed.model)
      } else {
        persistSelectedModel(undefined, '')
      }

      let message = `Set model to ${chalk.bold(renderModelLabel(modelValue))}`
      let wasFastModeToggledOn = undefined

      if (isFastModeEnabled()) {
        clearFastModeCooldown()
        if (!isFastModeSupportedByModel(modelValue) && isFastMode) {
          setAppState(prev_0 => ({
            ...prev_0,
            fastMode: false,
          }))
          wasFastModeToggledOn = false
        } else if (isFastModeSupportedByModel(modelValue) && isFastMode) {
          message += ' · Fast mode ON'
          wasFastModeToggledOn = true
        }
      }

      if (isBilledAsExtraUsage(modelValue, wasFastModeToggledOn === true, isOpus1mMergeEnabled())) {
        message += ' · Billed as extra usage'
      }

      if (wasFastModeToggledOn === false) {
        message += ' · Fast mode OFF'
      }

      onDone(message)
    }

    void handleModelChange()
  }, [model, onDone, setAppState])

  return null
}

function isKnownAlias(model: string): boolean {
  return (MODEL_ALIASES as readonly string[]).includes(model.toLowerCase().trim())
}

function isOpus1mUnavailable(model: string): boolean {
  const m = model.toLowerCase()
  return !checkOpus1mAccess() && !isOpus1mMergeEnabled() && m.includes('opus') && m.includes('[1m]')
}

function isSonnet1mUnavailable(model: string): boolean {
  const m = model.toLowerCase()
  return !checkSonnet1mAccess() && (m.includes('sonnet[1m]') || m.includes('sonnet-4-6[1m]'))
}

function ShowModelAndClose({
  onDone,
}: {
  onDone: (result?: string) => void
}): React.ReactNode {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const mainLoopModelForSession = useAppState(s => s.mainLoopModelForSession)
  const effortValue = useAppState(s => s.effortValue)

  const currentSelection = getCurrentSelection()

  const displayModel = renderModelLabel(mainLoopModel)
  const effortInfo = effortValue !== undefined ? ` (effort: ${effortValue})` : ''

  let modelInfo = ''
  if (currentSelection.isDefault) {
    modelInfo = `Current model: Default${effortInfo}`
  } else {
    const displayString = getModelSelectionDisplayString(currentSelection.modelString)
    modelInfo = `Current model: ${displayString}${effortInfo}`
  }

  if (mainLoopModelForSession) {
    modelInfo = `Current model: ${chalk.bold(renderModelLabel(mainLoopModelForSession))} (session override from plan mode)\nBase model: ${displayModel}${effortInfo}`
  }

  onDone(modelInfo)
  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  args = args?.trim() || ''

  if (COMMON_INFO_ARGS.includes(args)) {
    logEvent('tengu_model_command_inline_help', {
      args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return <ShowModelAndClose onDone={onDone} />
  }

  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(
      'Run /model to open the model selection menu, or /model [modelName] to set the model.\n' +
        'Supports provider::model format:\n' +
        '  /model sonnet                          - Set to Sonnet (alias)\n' +
        '  /model deepseek::deepseek-chat         - Set specific provider model\n' +
        '  /model provider::model                 - Any provider::model format',
      { display: 'system' },
    )
    return
  }

  if (args) {
    logEvent('tengu_model_command_inline', {
      args: args as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return <SetModelAndClose args={args} onDone={onDone} />
  }

  return <ModelPickerWrapper onDone={onDone} />
}

function renderModelLabel(model: string | null): string {
  const rendered = renderDefaultModelSetting(model ?? getDefaultMainLoopModelSetting())
  return model === null ? `${rendered} (default)` : rendered
}
