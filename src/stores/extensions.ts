import type { Extension } from '../types/extension';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

export const extensions = gqlSubscribable<Extension[]>(gql.SUB_EXTENSIONS, {}, [], null);
