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

// Busca el canal por ID, usando fetch si no está en caché
async function getChannel(guild) {
  if (CHANNEL_ID && guild.channels.cache.has(CHANNEL_ID)) {
    return guild.channels.cache.get(CHANNEL_ID);
  }
  try {
    return await guild.channels.fetch(CHANNEL_ID || '');
  } catch (err) {
    console.error('Canal no encontrado:', err.message);
    return null;
  }
}

client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`Evento GuildMemberAdd: ${member.user.tag} en ${member.guild.name}`);
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
    console.log('Entrada enviada al canal', CHANNEL_ID);
  } catch (err) {
    console.error('Error al registrar entrada:', err);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  console.log(`Evento GuildMemberRemove: ${member.user.tag} en ${member.guild.name}`);
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
    console.log('Salida enviada al canal', CHANNEL_ID);
  } catch (err) {
    console.error('Error al registrar salida:', err);
  }
});

if (!process.env.TOKEN) {
  console.error('FALTA LA VARIABLE TOKEN en las variables de entorno de Render.');
  process.exit(1);
}
if (!CHANNEL_ID) {
  console.error('FALTA LA VARIABLE CHANNEL_ID en las variables de entorno de Render.');
  process.exit(1);
}
console.log(`TOKEN definido: si (longitud ${process.env.TOKEN.length})`);
console.log(`CHANNEL_ID definido: ${CHANNEL_ID}`);

client.on('debug', (m) => console.log('[debug]', m));
client.on('warn', (m) => console.log('[warn]', m));

client
  .login(process.env.TOKEN)
  .then(() => console.log('Login ok, esperando evento ready...'))
  .catch((err) => {
    console.error('ERROR AL INICIAR SESIÓN:', err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    if (req.url === '/diag') {
      const out = { step: {} };
      const dns = require('dns');
      const done = () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out, null, 2));
      };
      dns.resolve('gateway.discord.gg', (err, addrs) => {
        out.step.dns = err ? `ERROR: ${err.code}` : addrs;
        const sock = require('net').connect({ host: 'gateway.discord.gg', port: 443, timeout: 8000 });
        const next = () => {
          if (out.step.ws) return;
          const ws = require('ws');
          const w = new ws('wss://gateway.discord.gg/?v=10&encoding=json', { timeout: 8000 });
          w.on('open', () => { out.step.ws = 'ok'; w.close(); });
          w.on('error', (e) => { out.step.ws = `ERROR: ${e.message}`; });
          w.on('close', () => { done(); });
        };
        sock.on('connect', () => { out.step.tcp = 'ok'; sock.destroy(); })
          .on('error', (e) => { out.step.tcp = `ERROR: ${e.message}`; next(); })
          .on('close', next);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  })
  .listen(PORT, () => console.log(`Servidor HTTP en el puerto ${PORT}`));