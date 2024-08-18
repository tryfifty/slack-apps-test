import { NotionAPILoader } from '@langchain/community/document_loaders/web/notionapi';
import { Document } from '@langchain/core/documents';
import { getNotionPageContent } from '../services/notion';

const getNotionSummary = (page: any): string => {
  console.log(page);
  const title = page.properties?.title?.title[0]?.plain_text;

  let properties = '';
  if (page.properties) {
    Object.entries(page.properties).forEach(([propertyName, propertyValue]: [string, any]) => {
      let value;
      console.log(propertyName, propertyValue);

      if (propertyValue.type === 'title') {
        return;
      }

      switch (propertyValue.type) {
        case 'title':
          // value = propertyValue.title.map((t: any) => t.plain_text).join(' ');
          break;
        case 'rich_text':
          value = propertyValue.rich_text.map((t: any) => t.plain_text).join(' ');
          break;
        case 'number':
          value = propertyValue.number;
          break;
        case 'select':
          value = propertyValue.select ? propertyValue.select.name : null;
          break;
        case 'multi_select':
          value = propertyValue.multi_select.map((s: any) => s.name).join(', ');
          break;
        case 'date':
          value = propertyValue.date ? propertyValue.date.start : null;
          break;
        case 'people':
          value = propertyValue.people.map((p: any) => p.name || p.id).join(', ');
          break;
        case 'files':
          value = propertyValue.files.map((f: any) => f.name).join(', ');
          break;
        case 'checkbox':
          value = propertyValue.checkbox ? 'Checked' : 'Unchecked';
          break;
        case 'url':
          value = propertyValue.url;
          break;
        case 'email':
          value = propertyValue.email;
          break;
        case 'phone_number':
          value = propertyValue.phone_number;
          break;
        case 'created_time':
          value = propertyValue.created_time;
          break;
        case 'relation':
          value = propertyValue.relation.map((r: any) => r.id).join(', ');
          break;
        case 'rollup':
          value = propertyValue.rollup.array
            .map((item: any) => {
              if (item.type === 'date') {
                return item.date.start;
              }
              if (item.type === 'formula') {
                return item.formula.string;
              }
              return JSON.stringify(item);
            })
            .join(', ');
          break;
        default:
          value = 'Unsupported property type';
      }

      properties += `${propertyName}: ${value}\n`;
    });
  }

  const summary = `---\n\n${title ? `Title: ${title}\n` : ''}${properties}---\n\n`;

  return summary;
};

const notionDataLoader = async (access_token, page) => {
  const { id: pageId, object: type } = page;

  if (type === 'page') {
    const content = await getNotionPageContent(access_token, pageId);
    const summary = getNotionSummary(page);

    const pageContent = summary + (content.parent === 'undefined' ? '' : content.parent);

    console.log(pageContent);

    return [
      new Document({
        pageContent,
        metadata: page,
      }),
    ];
  }

  // let loader = null;
  // if (type === 'database') {
  //   loader = new NotionAPILoader({
  //     clientOptions: {
  //       auth: access_token,
  //     },
  //     id: pageId,
  //     type,
  //     propertiesAsHeader: true,
  //   });
  // } else {
  //   console.warn('Unhandle type:', type);
  //   return [];
  // }

  let result = [];
  // try {
  //   result = await loader.load();
  // } catch (e) {
  //   console.error('Failed to load data:', e);
  // }

  return result;
};

export default notionDataLoader;
