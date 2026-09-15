# Bot-Discord

Bot de Discord que registra quién entra y quién sale de un servidor, enviando un embed al canal de bienvenida.

## Estructura

- `index.js` — código principal del bot
- `render.yaml` — blueprint de despliegue en Render
- `docs/` — páginas legales publicadas en GitHub Pages
- `package.json` — dependencias: `discord.js` y `dotenv`

## Cómo funciona

- Evento `GuildMemberAdd` → embed verde "Miembro entró" (discord.js:56)
- Evento `GuildMemberRemove` → embed rojo "Miembro salió" (discord.js:79)
- `getChannel()` busca el canal de registro por ID, con fallback a `fetch` si no está en caché (index.js:44)
- Servidor HTTP mínimo en `/` respondiendo `ok` para el healthcheck de Render (index.js:128)
- Secrets se leen de variables de entorno: `TOKEN` y `CHANNEL_ID`

## Configuración local

1. Copiar `.env.example` a `.env` y rellenar `TOKEN` y `CHANNEL_ID`.
2. En el Developer Portal de Discord: activar el intent privilegiado **Server Members**.
3. Invitar el bot con permisos de ver canales y enviar mensajes.
4. El canal de registro («#bienvenida», ID `1483898969028296826`) debe permitir al bot ver y escribir.
5. `npm install` y `npm start`.

## Despliegue en Render

- El servicio web usa el blueprint de `render.yaml` (región **frankfurt**).
- IMPORTANTE: la región debe ser **frankfurt** (u otra fuera de oregon). Los IPs de `oregon` reciben un bloqueo 429 "Access denied" de Cloudflare en la API de Discord mientras que el WebSocket del gateway sí pasa; cambiando de región se soluciona.
- Las variables `TOKEN` y `CHANNEL_ID` se configuran en el dashboard de Render (Environment).
- El plan free duerme el servicio tras 15 min sin peticiones: un monitor de UptimeRobot contra `https://<servicio>.onrender.com/` cada 5 min lo mantiene activo.

## Git / GitHub

- Repo: https://github.com/Torutox/Bot-Discord (rama `main`, usuario `Torutox`).
- GitHub Pages legal: https://torutox.github.io/Bot-Discord/ (términos y privacidad, fuente en `docs/`).
- Redeploy automático con cada `git push origin main`.
- `.env` está ignorado; nunca commitear claves.