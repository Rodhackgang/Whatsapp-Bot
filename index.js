const { makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { createSticker, StickerTypes } = require('wa-sticker-formatter');
const axios = require('axios');

async function connectWhatsapp() {
    console.log("Initialisation pour se connecter à mon compte...");
    const auth = await useMultiFileAuthState("session");
    const socket = makeWASocket({
        printQRInTerminal: true,
        browser: ["Rodhackgang", "", ""],
        auth: auth.state,
        logger: pino({ level: "silent" }),
    });

    socket.ev.on("creds.update", auth.saveCreds);
    socket.ev.on("connection.update", async ({ connection }) => {
        if (connection === "open") {
            console.log("Rodhackgang Bot operationel ✅");
        } else if (connection === "close") {
            console.log("Connexion fermé. En attente de reconnexion...");
            await connectWhatsapp();
        }
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
        console.log("Nouvelle detection de message:", messages);
        const chat = messages[0];
        
        
        if (chat.key.fromMe) {
            return;
        }

        let pesan = (chat.message?.extendedTextMessage?.text ?? chat.message?.ephemeralMessage?.message?.extendedTextMessage?.text ?? chat.message?.conversation)?.toLowerCase() || "";
        
    
        if (!pesan.startsWith(".")) {
            pesan = ".chatgpt " + pesan;
        }

        const command = pesan.split(" ")[0];
        console.log("Reception de la commande:", command);

        switch (command) {
            case ".ping":
                console.log("Executing .ping command...");
                await socket.sendMessage(chat.key.remoteJid, { text: "Tout semble etre bien configurer. En quoi puis je vous etre utile ?" }, { quoted: chat });
                break;

            case ".h":
            case ".hidetag":
                console.log("Execution du Tag de tous le monde...");
                const args = pesan.split(" ").slice(1).join(" ");

                if (!chat.key.remoteJid.includes("@g.us")) {
                    await socket.sendMessage(chat.key.remoteJid, { text: "*Command ini hanya bisa di gunakan di grub!!*" }, { quoted: chat });
                    return;
                }

                const metadata = await socket.groupMetadata(chat.key.remoteJid);
                const participants = metadata.participants.map((v) => v.id);
                console.log("Entrain d'envoyer le Tag a tous les membres du groupe", participants);

                socket.sendMessage(chat.key.remoteJid, {
                    text: args,
                    mentions: participants
                });

                break;

            case ".chatgpt":
                console.log("Execution de la commande chatgpt...");
                const query = pesan.split(" ").slice(1).join(" ");
                const apiUrl = `https://api.maher-zubair.tech/ai/chatgpt4?q=${encodeURIComponent(query)}`;

                try {
                    console.log("Entrain de faire la requette sur l'API:", apiUrl);
                    const response = await axios.get(apiUrl);
                    const result = response.data.result + "\n\n*Pour avoir des réponses plus professionnel acheter GPT personnel*";
                    console.log("Reception de la reponse de l'API:", result);

                    await socket.sendMessage(chat.key.remoteJid, { text: result }, { quoted: chat });
                } catch (error) {
                    console.error("Erreur l'api a un petit soucis:", error);
                    await socket.sendMessage(chat.key.remoteJid, { text: "Sorry, there was an error processing your request." }, { quoted: chat });
                }

                break;
        }

        if (chat.message?.imageMessage?.caption == '.sticker' && chat.message?.imageMessage) {
            console.log("En cours de generation du sticker...");

            const getMedia = async (msg) => {
                const messageType = Object.keys(msg?.message)[0];
                const stream = await downloadContentFromMessage(msg.message[messageType], messageType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                return buffer;
            };

            const mediaData = await getMedia(chat);
            const stickerOption = {
                pack: "Rodhackgang",
                author: "Rodhackgang",
                type: StickerTypes.FULL,
                quality: 50
            };

            const generateSticker = await createSticker(mediaData, stickerOption);
            console.log("En attente de generation de sticker...");
            await socket.sendMessage(chat.key.remoteJid, { sticker: generateSticker }); //langsung cobaaa
        }
    });
}

connectWhatsapp();
