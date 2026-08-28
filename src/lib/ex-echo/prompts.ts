import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const PROMPT_DIR = join(process.cwd(), 'prompts')

function loadPrompt(filename: string): string {
  const file = join(PROMPT_DIR, filename)

  if (!existsSync(file)) {
    throw new Error(`Prompt file not found: ${filename}`)
  }

  return readFileSync(file, 'utf-8').trim()
}

/**
 * 蒸馏共同记忆
 */
export const MEMORIES_PROMPT = loadPrompt('memories_builder.md')

/**
 * 蒸馏人格
 */
export const PERSONA_PROMPT = loadPrompt('persona_builder.md')

/**
 * 合并 Persona + Memory
 */
export const MERGER_PROMPT = loadPrompt('merger.md')

/**
 * AI 回复修正
 */
export const CORRECTION_PROMPT = loadPrompt('correction_handler.md')