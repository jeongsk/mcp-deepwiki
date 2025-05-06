# MCP DeepWiki

A server that facilitates library documentation access using DeepWiki.com. This MCP (Model Context Protocol) server provides tools for resolving library IDs and fetching comprehensive documentation from the DeepWiki service.

## Features

- **Library ID Resolution**: Search for libraries by name and retrieve their DeepWiki-compatible IDs
- **Documentation Retrieval**: Fetch documentation for any library using its ID
- **Query-Based Documentation**: Focus documentation retrieval on specific topics or questions

## Installation

```bash
# Clone the repository
git clone https://github.com/jeongsk/mcp-deepwiki.git
cd mcp-deepwiki

# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Usage

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-deepwiki": {
      "command": "node",
      "args": ["/path/to/mcp-deepwiki/dist/index.js"]
    }
  }
}
```

## Architecture

- `src/mcp-server.ts`: Main MCP server implementation with tools definition
- `src/deepwiki-search.ts`: Handles the interaction with DeepWiki.com using Playwright
- `src/index.ts`: Entry point for the server

## Requirements

- Node.js (version specified in .nvmrc)
- pnpm package manager (v9.15.1+)

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
