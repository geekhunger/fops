import {assert, type} from "type-approve"

export const strim = function(text, line_joiner = "\n") {
    assert(type({array: text}, {string: text}), "Argument must be a string or an array of strings!")

    const tabulator_length = 4 // equal count of whitespaces
    const whitespace_slurp_pattern = /[\u0020\u00a0\u2000-\u2009\u200a\u200b]/g
    const tabulator_swap_pattern = new RegExp(`${whitespace_slurp_pattern.source}{${tabulator_length},${tabulator_length}}`, "g")
    const linebreak_pattern = /[\r\n\f\v\u2028-\u3000]+/

    if(!type({array: text})) {
        if(!type({string: text})) {
            return text // can not handle anything other that strings
        }
        text = text.split(linebreak_pattern) // split (and flatten) by line vertical and horizontal line breaking characters
    } else {
        if(!text.every(paragraph => type({string: paragraph}))) {
            return text // can not handle because array contains other types than strings
        }
        text = text.map(paragraph => strim(paragraph))
    }

    text = text
        .filter(line => line.trim().length > 0) // discard empty lines
        .map(line => line
            .replace(whitespace_slurp_pattern, " ") // flatten all kinds of breakable and non-breakable whitespace characters
            .replace(tabulator_swap_pattern, "\t") // substitute whitespaces with tabulators
        )

    let leading_spaces = [] // collect prefixed spaces lengths to calculate the common space length over all lines of text
    for(const line of text) {
        const count = line.match(/^\s+/)?.[0]?.length || 0
        leading_spaces.push(count)
    }

    const common_leader = Math.min(...leading_spaces)

    return text
        .map(line => line
            .slice(common_leader)
            .trimEnd()
        )
        .join(line_joiner)
}

export default strim
