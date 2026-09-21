require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express'); // <-- Express eklendi

// Render'ın verdiği portu kullan veya yerelde test ediyorsan 3000'i seç
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot aktif ve çalışıyor!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web sunucusu ${PORT} portunda çalışıyor.`);
});

// Bot client'ı oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,       // Welcome için gerekli
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,    // Mesaj okumak istersen
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

// Token'ı buraya yaz (veya .env kullan)
const TOKEN = process.env.BOT_TOKEN;

// Komutlar için Collection
client.commands = new Collection();

// ======================
//  Welcome sistemini yükle
// ======================
const welcome = require('./welcome');
welcome.execute(client);

// ======================
//  Voice Panel sistemini yükle
// ======================
const voicePanel = require('./voicePanel');
voicePanel.execute(client);

// ======================
//  Bot hazır olduğunda
// ======================
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı![cite: 3]`);
    console.log(`📊 ${client.guilds.cache.size} sunucuda aktif[cite: 3]`);
    
    client.user.setActivity('Hoş geldin mesajları', { type: 3 }); // Watching
});

// Hata yakalama
client.on('error', (error) => {
    console.error('Bot hatası:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Botu başlat
client.login(TOKEN);
