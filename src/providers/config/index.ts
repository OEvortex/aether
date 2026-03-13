import type { ProviderConfig } from "../../types/sharedTypes";
import aihubmix from "./aihubmix.json";
import blackbox from "./blackbox.json";
import chatjimmy from "./chatjimmy.json";
import chutes from "./chutes.json";
import codex from "./codex.json";
import deepinfra from "./deepinfra.json";
import deepseek from "./deepseek.json";
import huggingface from "./huggingface.json";
import kilo from "./kilo.json";
import lightningai from "./lightningai.json";
import minimax from "./minimax.json";
import mistral from "./mistral.json";
import modelscope from "./modelscope.json";
import moonshot from "./moonshot.json";
import nanogpt from "./nanogpt.json";
import nvidia from "./nvidia.json";
import ollama from "./ollama.json";
import opencode from "./opencode.json";
import pollinations from "./pollinations.json";
import qwencli from "./qwencli.json";
import zenmux from "./zenmux.json";
import zhipu from "./zhipu.json";

const providers = {
	aihubmix,
	blackbox,
	chatjimmy,
	chutes,
	codex,
	deepinfra,
	deepseek,
	huggingface,
	kilo,
	lightningai,
	minimax,
	mistral,
	modelscope,
	moonshot,
	nanogpt,
	nvidia,
	ollama,
	opencode,
	pollinations,
	qwencli,
	zenmux,
	zhipu,
};

export type ProviderName = keyof typeof providers;

export const configProviders = providers as Record<
	ProviderName,
	ProviderConfig
>;
