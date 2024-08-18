import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { Document } from '@langchain/core/documents';

const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI;

const getAccessToken = async (code) => {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  console.log(code, encoded);
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const notionData = await response.json();
  // console.log(notionData);

  //   const { access_token, workspace_name, workspace_id, workspace_icon, bot_id } = notionData;

  return notionData;
};

/**
 * GET Notion Pages that user gives access
 * I know it's weird but
 * Notion API Doesn't have a method to get Authorized pages or something.
 * Only Search method is available for that purpose for now('24.07).
 * Search Result contains all pages and databases that user gives access.
 */
const getNotionPages = async (access_token): Promise<any[]> => {
  const notion = new Client({
    auth: access_token,
  });

  let allPages = [];
  let hasMore = true;
  let startCursor;

  while (hasMore) {
    const response = await notion.search({
      start_cursor: startCursor,
    });

    allPages = [...allPages, ...response.results];
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  console.log(`Total Pages: ${allPages.length}`);

  // Exclude pages that are in the database. cause later the database loader parse every children page of the database.
  // let topLevelPages = allPages.filter((page) => {
  //   if (page.parent?.type === 'database_id') {
  //     return false;
  //   }

  //   return true;
  // });

  // console.log(`Exclude Child of Database Level Pages: ${topLevelPages.length}`);

  // // Grep Database only to handle differently
  // const database = topLevelPages.filter((page) => {
  //   if (page.object === 'database') {
  //     return true;
  //   }

  //   return false;
  // });

  // console.log(`Database: ${database.length}`);

  // topLevelPages = topLevelPages.filter((page) => {
  //   if (page.object !== 'database') {
  //     return true;
  //   }

  //   return false;
  // });

  // // SubPage 빼는 로직 곧 지운다.loader 에서 child page 처리 안할것이다.
  // topLevelPages = topLevelPages.filter((page) => {
  //   // 그렇지 않다면, 부모가 다른 페이지인지를 확인
  //   // console.log('최 상위 페이지 찾기');

  //   if (allPages.some((otherPage) => otherPage.id === page.parent?.page_id)) {
  //     console.log('부모 페이지가 이미 존재함');
  //     return false;
  //   }

  //   return true;
  // });

  return allPages;
};

const getNotionPageContent = async (access_token, pageId) => {
  const notion = new Client({
    auth: access_token,
  });

  // passing notion client to the option
  const n2m = new NotionToMarkdown({
    notionClient: notion,
    config: {
      parseChildPages: false, // default: parseChildPages
    },
  });

  const content = await n2m.pageToMarkdown(pageId);
  const contentString = n2m.toMarkdownString(content);

  return contentString;
};

export { getAccessToken, getNotionPages, getNotionPageContent };
