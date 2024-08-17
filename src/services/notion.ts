// @ts-nocheck

import { Client } from '@notionhq/client';
import fs from 'fs';
import split from '../splitters/notionDataSplitter';
import embedding from '../embedders';
import { createCollection, insertVectorData, isCollectionExist } from './qdrant';

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
 */
const getNotionPages = async (access_token): any[] => {
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

  console.log(allPages.length);

  // // 최상위 부모 페이지 찾기
  let topLevelPages = allPages.filter((page) => {
    if (page.parent?.type === 'database_id') {
      return false;
    }

    return true;
  });

  let database = topLevelPages.filter((page) => {
    if (page.object === 'database') {
      return true;
    }

    return false;
  });

  console.log(database.length);

  topLevelPages = topLevelPages.filter((page) => {
    if (page.object !== 'database') {
      return true;
    }

    return false;
  });

  topLevelPages = topLevelPages.filter((page) => {
    // 그렇지 않다면, 부모가 다른 페이지인지를 확인
    // console.log('최 상위 페이지 찾기');

    if (allPages.some((otherPage) => otherPage.id === page.parent?.page_id)) {
      console.log('부모 페이지가 이미 존재함');
      return false;
    }

    return true;
  });

  console.log(topLevelPages.length);

  // console.log(page.length);

  // console.log(topLevelPages);

  return [...topLevelPages, ...database];

  // return allPages;
};

// const getNotionPageLoader = async (access_token, pageId, pageType) => {
//   const client = new Client({ auth: access_token });

//   console.log(`pageType: ${pageType} \npageId: ${pageId}\n`);

//   const data = [];

//   // Helper function to recursively get all pages and databases
//   const getPageData = async (id, type) => {
//     // If the block type is a database, fetch the data from the database
//     // if (type === 'database') {
//     //   // DO nothing for now
//     //   const databaseResponse = await client.databases.retrieve({ database_id: id });
//     //   const childrenData = await Promise.all(
//     //     databaseResponse.results.map(async (item) => {
//     //       if (item.object === 'page') {
//     //         return getPageData(item.id, 'page');
//     //       }
//     //       return {
//     //         id: item.id,
//     //         type: item.object,
//     //         data: item,
//     //       };
//     //     }),
//     //   );
//     //   return {
//     //     id,
//     //     type: 'database',
//     //     data: childrenData,
//     //   };
//     // }

//     // If the block type is a page, fetch the page content
//     if (type === 'page') {
//       const pageResponse = await client.pages.retrieve({ page_id: id });
//       console.log(pageResponse);
//       // const childrenResponse = await client.blocks.children.list({ block_id: id });
//       // const childrenData = await Promise.all(
//       //   childrenResponse.results.map(async (child) => {
//       //     if (child.type === 'child_page' || child.type === 'child_database') {
//       //       return getPageData(child.id, child.type === 'child_page' ? 'page' : 'database');
//       //     }
//       //     return {
//       //       id: child.id,
//       //       type: child.type,
//       //       data: child,
//       //     };
//       //   }),
//       // );
//       // return {
//       //   id,
//       //   type: 'page',
//       //   data: childrenData,
//       // };
//     }

//     return null;
//   };

//   const response = await getPageData(pageId, pageType);

//   console.log(response);

//   return response;
// };

export { getAccessToken, getNotionPages, getNotionPageLoader };
