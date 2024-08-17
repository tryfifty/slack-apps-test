const data = require('./notionPages.json');

let _data;

console.log(data.length);

// for (const page of data) {
//   if (page.parent.type === 'database_id') {
//     console.log('데이터베이스의 자식 Page');
//   } else if (page.parent.type === 'block_id') {
//     console.log('블록의 자식 Page');
//   } else if (page.parent.type === 'page_id') {
//     console.log('페이지의 자식 Page');
//   } else if (page.parent.type === 'workspace') {
//     console.log('워크스페이스의 자식 Page');
//   } else {
//     console.log('부모가 없는 Page');
//   }
// }

const block = data.filter((page) => page.parent.type === 'block_id');

// console.log(block.map((page) => page.properties.title?.title[0].plain_text));

const database = data.filter((page) => page.parent.type === 'database_id');

// console.log(database.length);

const d = data.filter((page) => page.object === 'database');

console.log(d.length);

const page = data.filter((page) => page.parent.type === 'page_id');

// console.log(page.length);

const workspace = data.filter((page) => page.parent.type === 'workspace');

// console.log(workspace[0].properties.title.title[0].plain_text);

// console.log(data.length === block.length + database.length + page.length + workspace.length);


// console.log(_data.map((page) => page.parent.type));

// _data = _data.filter((page) => data.some((p) => p.id !== page.parent.id));

// console.log(_data.length);

// idlist = data.map((page) => page.id);

// parentIdList = data.map((page) => page.parent?.type);
// console.log(parentIdList);
