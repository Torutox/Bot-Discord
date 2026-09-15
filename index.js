require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

const CHANNEL_ID = process.env.CHANNEL_ID || null;

client.once(Events.ClientReady, (c) => {
  console.log(`Bot conectado como ${c.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const channel = member.guild.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('Miembro entró')
      .setDescription(`**${member.user.tag}** (<@${member.user.id}>)`)
      .setColor(0x57f287)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Cuenta creada', value: member.user.createdAt.toLocaleDateString(), inline: true },
        { name: 'Miembros ahora', value: `${member.guild.memberCount}`, inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error al registrar entrada:', err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const channel = member.guild.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('Miembro salió')
      .setDescription(`**${member.user.tag}** (<@${member.user.id}>)`)
      .setColor(0xed4245)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Entró', value: member.joinedAt ? member.joinedAt.toLocaleDateString() : 'Desconocido', inline: true },
        { name: 'Miembros ahora', value: `${member.guild.memberCount}`, inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error al registrar salida:', err);
  }
});

client.login(process.env.TOKEN);

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  })
  .listen(PORT, () => console.log(`Servidor HTTP en el puerto ${PORT}`));