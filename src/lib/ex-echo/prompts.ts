import { readFileSync } from 'fs'
import { join } from 'path'

function loadPrompt(filename: string): string {
  return readFileSync(join(process.cwd(), 'prompts', filename), 'utf-8')
}

export const MEMORIES_PROMPT = loadPrompt('memories_builder.md')
export const PERSONA_PROMPT = loadPrompt('persona_builder.md')
export const MERGER_PROMPT = loadPrompt('merger.md')
export const CORRECTION_PROMPT = loadPrompt('correction_handler.md')