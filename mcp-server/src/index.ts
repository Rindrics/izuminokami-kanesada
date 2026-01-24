import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerDictionaryResources } from './resources/dictionary.js';
import { registerSchemaResources } from './resources/schema.js';
import { registerContentTools } from './tools/content.js';
import { registerDictionaryTools } from './tools/dictionary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
) as { name: string; version: string };

async function main() {
  console.error('[MCP] Starting server initialization...');

  const server = new McpServer({
    name: pkg.name,
    version: pkg.version,
  });

  console.error('[MCP] Server instance created');

  // Register resources
  registerSchemaResources(server);
  registerDictionaryResources(server);
  console.error('[MCP] Resources registered');

  // Register tools
  registerContentTools(server);
  registerDictionaryTools(server);
  console.error('[MCP] Tools registered');

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  console.error('[MCP] Transport created, connecting...');

  await server.connect(transport);

  console.error('[MCP] Server started and connected');
}

main().catch((err) => {
  console.error('Error starting MCP server:', err);
  process.exit(1);
});
