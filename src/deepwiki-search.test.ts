import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the entire module
vi.mock("@playwright/test", () => ({
  chromium: {
    launch: vi.fn().mockImplementation(() => {
      return {
        close: vi.fn(),
        newContext: vi.fn().mockImplementation(() => {
          return {
            newPage: vi.fn().mockImplementation(() => {
              return {
                $$: vi.fn().mockResolvedValue([
                  {
                    fill: vi.fn(),
                    press: vi.fn(),
                  },
                ]),
                goto: vi.fn(),
                locator: vi.fn().mockImplementation(() => {
                  return {
                    first: vi.fn().mockImplementation(() => {
                      return {
                        isVisible: vi.fn().mockResolvedValue(true),
                      };
                    }),
                  };
                }),
                screenshot: vi.fn(),
                waitForLoadState: vi.fn(),
                waitForTimeout: vi.fn(),
              };
            }),
            waitForEvent: vi.fn().mockImplementation(() => {
              return {
                close: vi.fn(),
                goto: vi.fn().mockResolvedValue({
                  json: vi.fn().mockResolvedValue({
                    queries: [
                      {
                        response: [
                          {
                            data: {
                              content: "test content",
                              filename: "test.ts",
                            },
                            type: "file_contents",
                          },
                        ],
                      },
                    ],
                  }),
                }),
                locator: vi.fn().mockImplementation(() => {
                  return {
                    first: vi.fn().mockImplementation(() => {
                      return {
                        isVisible: vi.fn().mockResolvedValue(true),
                      };
                    }),
                  };
                }),
                url: vi
                  .fn()
                  .mockReturnValue("https://api.devin.ai/ada/query/12345"),
                waitForLoadState: vi.fn(),
              };
            }),
          };
        }),
      };
    }),
  },
}));

// Import the module after mocking
import { searchDeepWiki } from "./deepwiki-search";

describe("searchDeepWiki", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return file contents on successful search", async () => {
    const result = await searchDeepWiki("test-repo", "test query");
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result as string);
    expect(parsed).toEqual([{ content: "test content", filename: "test.ts" }]);
  });

  it("should throw error when search input cannot be found", async () => {
    // Override the mock for this test case
    const { chromium } = await import("@playwright/test");
    const mockLaunch = chromium.launch as unknown as ReturnType<typeof vi.fn>;

    // Override the $$ mock to return an empty array
    mockLaunch.mockImplementationOnce(() => ({
      close: vi.fn(),
      newContext: vi.fn().mockImplementation(() => ({
        newPage: vi.fn().mockImplementation(() => ({
          $$: vi.fn().mockResolvedValue([]), // No textareas found
          goto: vi.fn(),
          screenshot: vi.fn(),
          waitForLoadState: vi.fn(),
          waitForTimeout: vi.fn(),
        })),
        waitForEvent: vi.fn(),
      })),
    }));

    await expect(searchDeepWiki("test-repo", "test query")).rejects.toThrow(
      "Could not find search input element",
    );
  });

  it("should throw error when answer element is not visible", async () => {
    // Override the mock for this test case
    const { chromium } = await import("@playwright/test");
    const mockLaunch = chromium.launch as unknown as ReturnType<typeof vi.fn>;

    // Override to make isVisible return false
    mockLaunch.mockImplementationOnce(() => ({
      close: vi.fn(),
      newContext: vi.fn().mockImplementation(() => ({
        newPage: vi.fn().mockImplementation(() => ({
          $$: vi.fn().mockResolvedValue([
            {
              fill: vi.fn(),
              press: vi.fn(),
            },
          ]),
          goto: vi.fn(),
          screenshot: vi.fn(),
          waitForLoadState: vi.fn(),
          waitForTimeout: vi.fn(),
        })),
        waitForEvent: vi.fn().mockImplementation(() => ({
          close: vi.fn(),
          locator: vi.fn().mockImplementation(() => ({
            first: vi.fn().mockImplementation(() => ({
              isVisible: vi.fn().mockResolvedValue(false), // Answer element not visible
            })),
          })),
          url: vi.fn().mockReturnValue("https://api.devin.ai/ada/query/12345"),
          waitForLoadState: vi.fn(),
        })),
      })),
    }));

    await expect(searchDeepWiki("test-repo", "test query")).rejects.toThrow(
      "Answer element not found on the page",
    );
  });
});
