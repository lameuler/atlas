const CHAR_LIMIT = 230

function parse(excerpt: string) {
    const parsed = []
    let prev = 0
    while (true) {
        const start = excerpt.indexOf('<mark>', prev)
        if (start !== -1) {
            const end = excerpt.indexOf('</mark>', start + 6)
            parsed.push({ text: excerpt.substring(prev, start) })
            if (end !== -1) {
                parsed.push({ text: excerpt.substring(start + 6, end), marked: true })
                prev = end + 7
            } else {
                prev = start + 6
            }
        } else {
            break
        }
    }
    parsed.push({ text: excerpt.substring(prev, excerpt.length) })
    return parsed
}

export function cut(excerpt: string) {
    const parsed = parse(excerpt)
    let chars = 0
    const cut = []
    for (const part of parsed) {
        const remaining = CHAR_LIMIT - chars
        if (remaining < part.text.length) {
            let text = part.text.substring(0, remaining - 20)
            if (text) {
                const last = text.charCodeAt(text.length - 1)
                if (last >= 0xd800 && last <= 0xdbff) {
                    text += part.text[text.length]
                }
                part.text = text + '…'
                cut.push(part)
            }
            break
        }
        cut.push(part)
        chars += part.text.length
    }
    let result = ''
    for (const part of cut) {
        if (part.marked) {
            result += '<mark>' + part.text.replaceAll('\n', '') + '</mark>'
        } else {
            result += part.text
        }
    }
    return result
}
