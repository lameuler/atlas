import { Comment } from 'typedoc'

const usedComments = new WeakSet<Comment>()

export function unused(comment: Comment | null | undefined): comment is Comment {
    return comment instanceof Comment && !usedComments.has(comment)
}

export function use(comment: Comment | null | undefined) {
    if (comment instanceof Comment && !usedComments.has(comment)) {
        usedComments.add(comment)
        return comment
    }
    return undefined
}