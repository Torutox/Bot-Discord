require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  rest: { timeout: 20000, retries: 2 },
});

const __origGet = client.rest.get.bind(client.rest);
client.rest.get = async (...args) => {
  const route = args[0] && args[0].route ? args[0].route : String(args[0] ?? '');
  console.log('[rest] GET inicio:', route);
  const t0 = Date.now();
  const timer = setTimeout(() => console.log(`[rest] SIGUE PENDIENTE tras 30s: ${route}`), 30000);
  try {
    const r = await __origGet(...args);
    console.log(`[rest] GET ok: ${route} en ${Date.now() - t0}ms`);
    return r;
  } catch (e) {
    console.log(`[rest] GET error: ${route} -> ${e.message}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

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
    if (req.url === '/diag2') {
      const out = {};
      const ws = require('ws');
      const url = 'wss://gateway.discord.gg/?v=10&encoding=json&compress=zlib-stream&shard_id=0&shard_count=1';
      let timedOut = false;
      const w = new ws(url, { timeout: 10000 });
      const t = setTimeout(() => { timedOut = true; out.ws = 'TIMEOUT (10s sin respuesta)'; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out)); try { w.terminate(); } catch (e) {} }, 11000);
      w.on('open', () => { out.ws = 'ok'; out.url = url; clearTimeout(t); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out)); w.close(); });
      w.on('message', (m) => { console.log('[diag2] mensaje del gateway:', m.toString().slice(0, 200)); });
      w.on('unexpected-response', (_req, resp) => { out.ws = `unexpected-response ${resp.statusCode}`; clearTimeout(t); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out)); });
      w.on('error', (e) => { out.ws = `ERROR: ${e.message}`; clearTimeout(t); if (!timedOut) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out)); } });
      return;
    }
    if (req.url === '/diag3') {
      const out = { proxyEnv: {} };
      for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy']) {
        if (process.env[k]) out.proxyEnv[k] = process.env[k];
      }
      const send = () => {
        for (const k of ['gateway', 'api']) out[k] = out[k] || 'no completó';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out, null, 2));
      };
      const https = require('https');
      const reqH = https.get('https://discord.com/api/v10/gateway/bot', { timeout: 8000 }, (r) => {
        out.api_https = `status ${r.statusCode}`;
        r.resume();
        check();
      });
      reqH.on('timeout', () => { out.api_https = 'TIMEOUT https.get'; reqH.destroy(); check(); });
      reqH.on('error', (e) => { out.api_https = `ERROR: ${e.message}`; check(); });
      let done = false;
      const check = () => { if (--pending === 0) send(); };
      let pending = 2;
      fetch('https://discord.com/api/v10/gateway/bot').then((r) => {
        out.api_fetch = `status ${r.status}`;
        check();
      }).catch((e) => {
        out.api_fetch = `ERROR: ${e.message}`;
        check();
      });
      setTimeout(() => { out.api_fetch = out.api_fetch || 'TIMEOUT fetch (10s)'; check(); }, 10000);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  })
  .listen(PORT, () => console.log(`Servidor HTTP en el puerto ${PORT}`));