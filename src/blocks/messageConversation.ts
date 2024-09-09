import slackify from 'slackify-markdown';

const msgConversation = (message, sources = []) => {
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
  ];

  if (sources.length > 0) {
    blocks.push({
      type: 'divider',
    });

    let sourcesUrls = [];
    for (const source of sources) {
      const metatdata = source.payload?.metadata;

      console.log(metatdata);
      let sourceText = '';
      if (metatdata.source === 'notion') {
        sourceText = `*Notion* - [${metatdata.properties.title.title[0].plain_text}-line ${metatdata.loc.lines.from}~](${metatdata.url})`;
      }

      if (metatdata.source === 'figma') {
        sourceText = `*Figma* - [${metatdata.figmaFileName}/${metatdata.figmaName}](${metatdata.imageUrl})`;
      }

      console.log(sourceText);
      sourcesUrls.push(sourceText);
    }

    // remove duplicates
    sourcesUrls = [...new Set(sourcesUrls)];

    for (const sourceText of sourcesUrls) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: slackify(sourceText),
        },
      });
    }
  }

  return blocks;
};

export default msgConversation;
