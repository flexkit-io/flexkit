import { createToolsHandler } from '@flexkit/tools';
import tools from '../../../../flexkit.tools';

export const runtime = 'nodejs';

// Reads FLEXKIT_TOOLS_SECRET (and FLEXKIT_TOOLS_SECRET_PREVIOUS during a rotation).
const handler = createToolsHandler(tools);

export { handler as GET, handler as POST };
