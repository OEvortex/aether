import type { Command } from '../../commands.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'
import {
  getCurrentSelection,
  getModelSelectionDisplayString,
} from '../../utils/model/modelSelection.js'

export default {
  type: 'local-jsx',
  name: 'provider',
  description: `Provider status, list, set (current: ${getModelSelectionDisplayString(getCurrentSelection().modelString) || 'none'})`,
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./status.js'),
} satisfies Command
