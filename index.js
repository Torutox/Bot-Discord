require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

const CHANNEL_ID = process.env.CHANNEL_ID || null;

if (!process.env.TOKEN) {
  console.error('FALTA LA VARIABLE TOKEN en las variables de entorno.');
  process.exit(1);
}
if (!CHANNEL_ID) {
  console.error('FALTA LA VARIABLE CHANNEL_ID en las variables de entorno.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  rest: { timeout: 20000, retries: 2 },
});

client.once(Events.ClientReady, (c) => {
  console.log(`Bot conectado como ${c.user.tag}`);
});

// Busca el canal por ID, usando fetch si no está en caché
async function getChannel(guild) {
  if (guild.channels.cache.has(CHANNEL_ID)) {
    return guild.channels.cache.get(CHANNEL_ID);
  }
  try {
    return await guild.channels.fetch(CHANNEL_ID);
  } catch (err) {
    console.error('Canal no encontrado:', err.message);
    return null;
  }
}

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const channel = await getChannel(member.guild);
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
    const channel = await getChannel(member.guild);
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

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  })
  .listen(PORT, () => console.log(`Servidor HTTP en el puerto ${PORT}`));

client.login(process.env.TOKEN).catch((err) => {
  console.error('ERROR AL INICIAR SESIÓN:', err.message);
  process.exit(1);
});