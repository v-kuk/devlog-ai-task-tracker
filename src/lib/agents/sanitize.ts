// Belt-and-braces against prompt injection: strip tokens that could trick the
// model into treating user content as role-level instructions, and wrap all
// user-controlled strings in a delimited data block.

const ROLE_TOKEN_PATTERNS = [
  // XML-style role tags used by Anthropic, OpenAI, and other model families
  /<\/?(user|assistant|system|human)\b[^>]*>/gi,
  // Special boundary tokens (Llama, Qwen, Mistral, etc.)
  /<\|(?:im_start|im_end|system|user|assistant|begin_of_text|end_of_text|eot_id|start_header_id|end_header_id)\|>/g,
  // Llama 2 instruction markers
  /<\/?(s|SYS|INST)\b[^>]*>/g,
];

export function stripRoleTokens(s: string): string {
  let result = s;
  for (const re of ROLE_TOKEN_PATTERNS) {
    result = result.replace(re, "");
  }
  return result;
}

export function wrapUntrusted(content: string): string {
  return `<user_task_data>\n${content}\n</user_task_data>`;
}
