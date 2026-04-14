export enum ProviderKey {
	AIHubMix = 'aihubmix',
	Apertis = 'apertis',
	AvaSupernova = 'ava-supernova',
	Baseten = 'baseten',
	Berget = 'berget',
	Blackbox = 'blackbox',
	ChatJimmy = 'chatjimmy',
	Chutes = 'chutes',
	Clarifai = 'clarifai',
	Cline = 'cline',
	Codex = 'codex',
	Compatible = 'compatible',
	Cortecs = 'cortecs',
	DeepInfra = 'deepinfra',
	DeepSeek = 'deepseek',
	Dinference = 'dinference',
	Fastrouter = 'fastrouter',
	Fireworks = 'fireworks',
	Friendli = 'friendli',
	Hicapai = 'hicapai',
	Huggingface = 'huggingface',
	Jiekou = 'jiekou',
	Kilo = 'kilo',
	Kimi = 'kimi',
	Knox = 'knox',
	LightningAI = 'lightningai',
	Llmgateway = 'llmgateway',
	Meganova = 'meganova',
	MiniMax = 'minimax',
	MiniMaxCoding = 'minimax-coding',
	Mistral = 'mistral',
	Moark = 'moark',
	Modal = 'modal',
	ModelScope = 'modelscope',
	Moonshot = 'moonshot',
	Nanogpt = 'nanogpt',
	Nvidia = 'nvidia',
	Ollama = 'ollama',
	OpenAI = 'openai',
	OpenCode = 'opencode',
	Opencodego = 'opencodego',
	Pollinations = 'pollinations',
	Puter = 'puter',
	QwenCli = 'qwencli',
	Seraphyn = 'seraphyn',
	Sherlock = 'sherlock',
	Vercelai = 'vercelai',
	Zenmux = 'zenmux',
	Zhipu = 'zhipu',
}

/**
 * Provider category for unified settings organization
 */
export enum ProviderCategory {
	OpenAI = 'openai',
	Anthropic = 'anthropic',
	OAuth = 'oauth',
}

/**
 * Provider feature flags used by unified settings UI
 */
export interface ProviderFeatureFlags {
	supportsApiKey: boolean;
	supportsOAuth: boolean;
	supportsMultiAccount: boolean;
	supportsConfigWizard: boolean;
}

/**
 * Provider metadata for unified settings and configuration wizard
 */
export interface ProviderMetadata {
	id: string;
	key?: ProviderKey;
	displayName: string;
	category: ProviderCategory;
	sdkMode?: 'openai' | 'anthropic' | 'oai-response' | 'mixed';
	description?: string;
	icon?: string;
	settingsPrefix?: string;
	baseUrl?: string;
	features: ProviderFeatureFlags;
	order: number;
}
