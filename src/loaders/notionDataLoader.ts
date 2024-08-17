import { NotionAPILoader } from '@langchain/community/document_loaders/web/notionapi';

const notionDataLoader = async (access_token, pageId, type, wholeList) => {
  let loader = null;
  if (type === 'page') {
    loader = new NotionAPILoader({
      clientOptions: {
        auth: access_token,
      },
      id: pageId,
      type,
    });
  } else if (type === 'database') {
    // check the id is exist in wholeList
    const isExist = wholeList.some((item) => item.id === pageId);

    if (!isExist) {
      console.warn('Not exist pageId:', pageId);
      return [];
    }

    loader = new NotionAPILoader({
      clientOptions: {
        auth: access_token,
      },
      id: pageId,
      type,
      propertiesAsHeader: true,
    });
  } else {
    console.warn('Unhandle type:', type);
    return [];
  }

  let result = [];
  try {
    result = await loader.load();
  } catch (e) {
    console.error('Failed to load data:', e);
  }

  return result;
};

export default notionDataLoader;
