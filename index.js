require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
//  Voice Panel sistemini yükle (EKLENDİ)
// ======================
const voicePanel = require('./voicePanel');
voicePanel.execute(client);

// ======================
//  Bot hazır olduğunda
// ======================
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);
    console.log(`📊 ${client.guilds.cache.size} sunucuda aktif`);
    
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