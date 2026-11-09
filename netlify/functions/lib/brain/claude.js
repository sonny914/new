// Company Brain: one Claude call that returns JSON matching a schema.
// Structured outputs keep the reply parseable; server-side fallbacks re-run a declined request on Anthropic's
// recommended model inside the same call, so a classifier false positive does not leave a question unanswered.
import Anthropic from '@anthropic-ai/sdk';

export function createClaude({ model, effort, client = new Anthropic() }) {
  return async function askJSON({ system, prompt, schema, maxTokens = 4000 }) {
    const response = await client.beta.messages.create({
      model,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
      output_config: { effort, format: { type: 'json_schema', schema } },
    });
    if (response.stop_reason === 'refusal') {
      const err = new Error('Claude declined this request');
      err.code = 'refusal';
      throw err;
    }
    if (response.stop_reason === 'max_tokens') throw new Error('Claude ran out of room before finishing the answer');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return JSON.parse(text);
  };
}
