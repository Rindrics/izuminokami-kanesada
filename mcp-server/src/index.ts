import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerDictionaryResources } from './resources/dictionary';
import { registerSchemaResources } from './resources/schema';
import { registerContentTools } from './tools/content';
import { registerDictionaryTools } from './tools/dictionary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
) as { name: string; version: string };

async function main() {
  const server = new McpServer({
    name: pkg.name,
    version: pkg.version,
  });

  // Register resources
  registerSchemaResources(server);
  registerDictionaryResources(server);

  // Register tools
  registerContentTools(server);
  registerDictionaryTools(server);

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MCP server started');
}

main().catch((err) => {
  console.error('Error starting MCP server:', err);
  process.exit(1);
});
