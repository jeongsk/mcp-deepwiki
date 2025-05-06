/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { FastMCP } from "fastmcp";
import { z } from "zod";

import { searchDeepWiki } from "./deepwiki-search.js";

// Create a new MCP server
const server = new FastMCP({
  instructions:
    "This server provides tools for resolving library IDs and fetching documentation",
  name: "DeepWiki MCP Server",
  version: "1.0.0",
});

// Define the interface for library search response
interface LibrarySearchResult {
  description: string;
  id: string;
  language: string;
  last_modified: string;
  repo_name: string;
  stargazers_count: number;
  topics: Array<string>;
}

// Implement the resolve-library-id tool
server.addTool({
  description: `Resolves a package name to a library ID and returns a list of matching libraries.

You MUST call this function before 'get-library-docs' to obtain a valid library ID.

When selecting the best match, consider:
- Name similarity to the query
- Description relevance
- Code Snippet count (documentation coverage)
- GitHub Stars (popularity)

Return the selected library ID and explain your choice. If there are multiple good matches, mention this but proceed with the most relevant one.`,
  execute: async (args) => {
    try {
      // Call the API to search for libraries
      const response = await axios.get(
        `https://api.devin.ai/ada/list_public_indexes?search_repo=${encodeURIComponent(
          args.libraryName,
        )}`,
      );

      // Extract the results
      const libraries: LibrarySearchResult[] = response.data.indices;

      if (libraries.length === 0) {
        return JSON.stringify({
          message: `No libraries found matching "${args.libraryName}"`,
          status: "error",
        });
      }

      // Sort libraries by relevance
      // We'll use a simple scoring system considering:
      const scoredLibraries = libraries
        .map((lib) => {
          let score = 0;

          // Exact name match gets highest priority
          if (
            lib.repo_name.toLowerCase().split("/")?.[0] ===
            args.libraryName.toLowerCase()
          ) {
            score += 100;
          } else if (
            lib.repo_name.toLowerCase().includes(args.libraryName.toLowerCase())
          ) {
            score += 50;
          }

          // Add points for stargazers count
          score += Math.min(lib.stargazers_count / 100, 50);

          return { ...lib, score };
        })
        .sort((a, b) => b.score - a.score);

      // Select the best match
      const bestMatch = scoredLibraries[0];

      return JSON.stringify({
        bestMatch: bestMatch.repo_name,
        libraries: scoredLibraries.slice(0, 5).map((lib) => ({
          description: lib.description,
          language: lib.language,
          libraryID: lib.repo_name,
          score: lib.score,
          stargazersCount: lib.stargazers_count,
        })),
        status: "success",
      });
    } catch (error) {
      console.error("Error in resolve-library-id:", error);
      return JSON.stringify({
        message: `Failed to resolve library ID: ${
          error instanceof Error ? error.message : String(error)
        }`,
        status: "error",
      });
    }
  },
  name: "resolve-library-id",
  parameters: z.object({
    libraryName: z
      .string()
      .describe("Library name to search for and retrieve a library ID"),
  }),
});

// Implement the get-library-docs tool
server.addTool({
  description:
    "Fetches up-to-date documentation for a library. You must call 'resolve-library-id' first to obtain the exact library docs",
  execute: async (args, { log }) => {
    try {
      // Extract the query ID from the repository
      const repoId = args.libraryID;

      if (!repoId || repoId.trim() === "") {
        return JSON.stringify({
          message:
            "Invalid library ID. Please provide a valid library ID from the 'resolve-library-id' tool.",
          status: "error",
        });
      }

      // Create a search query
      const searchQuery = args.query || "";

      // Get the search results
      let docs = await searchDeepWiki(repoId, searchQuery);

      if (!docs) {
        return JSON.stringify({
          message:
            "Failed to retrieve documentation. Search process did not return a valid URL.",
          status: "error",
        });
      }

      // Extract the query ID from the URL
      const queryId = docs.split("/").pop();

      if (!queryId) {
        return JSON.stringify({
          message: "Failed to extract query ID from search results URL.",
          status: "error",
        });
      }

      // Calculate token limit (rough estimation: 1 token ≈ 4 characters)
      const maxTokens = args.maxTokens || -1;
      const maxChars = maxTokens * 4;

      if (maxTokens !== -1 && docs.length > maxChars) {
        docs =
          docs.substring(0, maxChars) +
          "\n\n[Documentation truncated due to token limit]";
      }

      return JSON.stringify({
        documentation: docs,
        library_id: repoId,
        query: args.query,
        status: "success",
      });
    } catch (error: any) {
      log.error("Error in get-library-docs:", error);
      return JSON.stringify({
        message: `Failed to fetch library documentation: ${
          error instanceof Error ? error.message : String(error)
        }`,
        status: "error",
      });
    }
  },
  name: "get-library-docs",
  parameters: z.object({
    libraryID: z
      .string()
      .describe(
        "Exact library ID (e.g., 'mongodb/docs', 'vercel/nextjs') retrieved from 'resolve-library-id'",
      ),
    maxTokens: z
      .number()
      .optional()
      .default(-1)
      .describe(
        "Maximum number of tokens of documentation to retrieve (default: -1). Higher values provide more context but consume more tokens.",
      ),
    query: z
      .string()
      .optional()
      .describe(
        "Query to focus documentation on (e.g., 'how to use hooks?', 'how to use routing?').",
      ),
  }),
});

// Start the server
server.start({
  transportType: "stdio",
});
