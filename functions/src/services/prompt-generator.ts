export class PromptGenerator {
  // Common words to filter out (articles, prepositions, etc.)
  private static readonly STOP_WORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'up',
    'about',
    'into',
    'through',
    'during',
    'my',
    'your',
    'our',
    'their',
    'playlist',
    'music',
    'songs',
    'tracks'
  ]);

  /**
   * Generates an AI prompt from playlist metadata.
   * Extracts meaningful words from title and description as cues.
   */
  public static generatePrompt(
    playlistName: string,
    description?: string,
    isInstrumentalOnly?: boolean
  ): string {
    // Extract meaningful words from title
    const titleWords = playlistName
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.STOP_WORDS.has(word));

    // Build base prompt
    let prompt = `Generate a curated playlist for "${playlistName}".`;

    if (description) {
      prompt += `\n\nPlaylist Description: ${description}`;
    }

    // Use title words as style cues
    if (titleWords.length > 0) {
      prompt += `\n\nStyle keywords from title: ${titleWords.join(', ')}.`;
      prompt += '\nUse these keywords to guide the mood, genre, and vibe of your suggestions.';
    }

    if (isInstrumentalOnly) {
      prompt += '\n\n**IMPORTANT**: Only suggest instrumental tracks (no vocals).';
    }

    prompt += '\n\nSuggest tracks that match this vibe perfectly.';

    return prompt;
  }
}
