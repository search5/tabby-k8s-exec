import { parse as parseShellCommand, ParseEntry } from 'shell-quote'

// Quote-aware split so `/bin/sh -c "echo hello world"` stays 3 tokens, not 5.
export function tokenizeShellCommand (command: string): string[] {
    const tokens: ParseEntry[] = parseShellCommand(command.trim())
    return tokens.map((token): string => {
        if (typeof token === 'string') {
            return token
        }
        if ('pattern' in token) {
            return token.pattern
        }
        if ('op' in token) {
            return token.op
        }
        return String(token)
    })
}
