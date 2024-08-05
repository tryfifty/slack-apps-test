import { NotionAPILoader } from '@langchain/community/document_loaders/web/notionapi';

/**
 * TODO:: Should hanlde type (ig. page, database)
 */
const notionDataLoader = async (access_token, pageId) => {
  const loader = new NotionAPILoader({
    clientOptions: {
      auth: access_token,
    },
    id: pageId,
    type: 'page',
  });

  return loader.load();
};

export default notionDataLoader;
