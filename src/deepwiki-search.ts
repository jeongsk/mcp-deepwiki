/* eslint-disable @typescript-eslint/no-explicit-any */
import { chromium } from "@playwright/test";

/**
 * Search the DeepWiki site and capture the URL of the new tab
 * @param searchQuery - Query to search for
 * @returns Promise resolving to the URL of the search results page
 */
async function searchDeepWiki(
  repoId: string,
  searchQuery: string,
): Promise<null | string> {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext();
  const page = await context.newPage();
  let content: null | string = null;

  try {
    await page.goto(`https://deepwiki.com/${repoId}`);
    await page.waitForLoadState("networkidle");
    const newPagePromise = context.waitForEvent("page");
    await page.waitForTimeout(2000);
    const textareas = await page.$$("textarea");

    if (textareas.length > 0) {
      // Assuming the first textarea is for search, we fill it with our search query
      await textareas[0].fill(searchQuery);
      await textareas[0].press("Enter");
    } else {
      throw new Error("Could not find search input element");
    }

    // Wait for the new tab/page to open
    const newPage = await newPagePromise;
    await newPage.waitForLoadState("networkidle");

    const newUrl = newPage.url();
    const queryId = newUrl.split("/").pop();

    const answerElement = await newPage
      .locator('h1:has-text("Answer")')
      .first();
    await answerElement.isVisible({ timeout: 10000 });
    await newPage.waitForLoadState("networkidle");

    // Get the API URL
    const apiUrl = `https://api.devin.ai/ada/query/${queryId}`;
    const results = await newPage.goto(apiUrl);
    const json = await results?.json();
    const fileContents = json.queries[0].response
      ?.filter((r: any) => r.type === "file_contents" || r.type === "chunk")
      .map((r: any) => r.data);
    content = JSON.stringify(fileContents, null, 2);

    // Close the new page
    await newPage.close();
  } catch (error) {
    console.error("Error during search process:", error);
    // Take a screenshot of what happened
    await page?.screenshot({ path: "error-screenshot.png" });
    throw error;
  } finally {
    // Close the browser
    await browser.close();
  }

  return content;
}

export { searchDeepWiki };
