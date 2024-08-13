import { Client } from '@notionhq/client';
import notionDataLoader from '../loaders/notionDataLoader';
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
const getNotionPages = async (access_token) => {
  const notion = new Client({
    auth: access_token,
  });

  /**
   * TODO: Check if the children page is included or not.
   */
  return notion.search({});
};

export { getAccessToken, getNotionPages };
