import type { MaybeToken, Rule } from "$lib/types/auth";

export const alwaysTrue: Rule = (_: MaybeToken): true | false => {
    return true;
};

export const allPresent: Rule = (token: MaybeToken) => {
    return !!token
};

// export const hasRole: (role: string) => Rule = (role: string) => {
//     return (token: MaybeToken): boolean => {
//         return roles(token).require(role);
//     }
// };