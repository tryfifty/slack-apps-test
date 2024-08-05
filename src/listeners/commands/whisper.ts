import msgEmpheral from '../../blocks/messageEphemeral';
import generateAnswer from '../../services/chat';

const whipser = async ({ ack, respond, command, payload, client }) => {
  await ack();

  if (payload.text.length > 0) {
    // Initial ephemeral message indicating bot is typing
    // const temp = await client.chat.postEphemeral({
    //   channel: payload.channel_id,
    //   user: payload.user_id, // Ephemeral messages require a user ID
    //   text: 'Bot is typing...',
    // });

    console.log('payload', payload);

    const answer = await generateAnswer({
      message: payload.text,
      from: 'whipser',
      channel: payload.channel_id,
      ts: null,
      client,
    });

    // Post the new ephemeral message with the answer
    await respond({
      blocks: msgEmpheral(answer),
    });
  } else {
    await respond({
      text: 'Sorry say that again? I can not hear you.',
    });
  }
};

export default whipser;
