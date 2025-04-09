import { env } from '$env/dynamic/public';
import { SequencingMode } from '../enums/sequencing';

export const SEQUENCE_EXPANSION_MODE =
  env.PUBLIC_COMMAND_EXPANSION_MODE === 'templating' ? SequencingMode.TEMPLATING : SequencingMode.TYPESCRIPT;
export const TYPESCRIPT_EXPANSION_NOT_AVAILABLE_MESSAGE =
  'Typescript Expansion functionality not available in "templating" command expansion mode. Please change the PUBLIC_COMMAND_EXPANSION_MODE environment variable to "typescript" in docker-compose.yml/.env.';
export const TEMPLATE_EXPANSION_NOT_AVAILABLE_MESSAGE =
  'Sequence Template functionality not available in "typescript" command Expansion mode. Please change the PUBLIC_COMMAND_EXPANSION_MODE environment variable to "templating" in docker-compose.yml/.env.';
