require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    GatewayIntentBits
} = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { Client } = require('discord.js');

// ======================
//  ŞİFRELEME AYARLARI
// ======================
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 karakter olmalı
const ALGORITHM = 'aes-256-cbc';
const DATA_FILE = path.join(__dirname, 'connections.json');

// Şifreleme fonksiyonu
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Şifre çözme fonksiyonu
function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Verileri kaydet
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Verileri oku
function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Aktif bağlantılar (bellekte)
const activeConnections = new Map();

module.exports = {
    name: 'voicePanel',

    execute(client) {

        // Bot başladığında kayıtlı bağlantıları geri yükle
        client.once('ready', async () => {
            const saved = loadData();
            for (const [userId, info] of Object.entries(saved)) {
                try {
                    const token = decrypt(info.encryptedToken);
                    await connectVoice(userId, token, info.channelId);
                    console.log(`[Voice] ${userId} için bağlantı geri yüklendi`);
                } catch (err) {
                    console.error(`[Voice] ${userId} geri yüklenemedi:`, err.message);
                }
            }
        });

        // ======================
        //  PANEL KOMUTU
        // ======================
        client.on('messageCreate', async (message) => {
            if (message.content === '!ses' && message.member.permissions.has('Administrator')) {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('7/24 Ses Bağlantı Paneli')
                    .setDescription(
                        '<:site:1551605548590309387> **ZEUS — Bot Ses Yönetimi**\n\n' +
                        '<a:dclogo:1551605543716782261> **Sistem Durumu:** `Hazır / Çevrimiçi`\n' +
                        '──────────────────────────────\n\n' +
                        '<:classadam:1551605484178378822> **Bot Yönetimi Nedir?**\n\n' +
                        'Standart Discord bot tokenlerini ses kanallarına **7/24 kesintisiz** bağlar. Aktif bot listeni görebilir, durum varlıklarını değiştirebilir ve bağlantıları kesebilirsin.\n\n' +
                        '──────────────────────────────\n\n' +
                        '🌙 **Seçenekler**\n\n' +
                        '>`<a:snowflake:1551605446203408384>` **Bot Sese Kur** — Tekli veya toplu bot tokenlerini ses kanalına sokar\n' +
                        '>`<a:snowflake:1551605446203408384>` **Bağlantıyı Kes** — Ses bağlantılarını güvenle sonlandırır'
                        '🔒 Tokenlerin **şifrelenerek** saklanır.'
                    )
                    .setFooter({ text: 'Zeus Bot • Encrypted Voice System' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('voice_connect')
                        .setLabel('Bot Sese Kur / Bağlan')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('<:plus:1551605515375607888>'),
                    new ButtonBuilder()
                        .setCustomId('voice_disconnect')
                        .setLabel('Bağlantıyı Kes / Sil')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:silme:1551605463395868782>')
                );

                await message.channel.send({ embeds: [embed], components: [row] });
            }
        });

        // ======================
        //  INTERACTION
        // ======================
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isModalSubmit()) return;

            // Sese Bağlan
            if (interaction.customId === 'voice_connect') {
                const modal = new ModalBuilder()
                    .setCustomId('voice_modal')
                    .setTitle('7/24 Ses Bağlantısı');

                const tokenInput = new TextInputBuilder()
                    .setCustomId('bot_token')
                    .setLabel('Bot Token')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Bot tokenini buraya yapıştır')
                    .setRequired(true);

                const channelInput = new TextInputBuilder()
                    .setCustomId('channel_id')
                    .setLabel('Ses Kanalı ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ses kanalının ID\'sini yaz')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(tokenInput),
                    new ActionRowBuilder().addComponents(channelInput)
                );

                await interaction.showModal(modal);
            }

            // Bağlantıyı Kes
            if (interaction.customId === 'voice_disconnect') {
                const data = activeConnections.get(interaction.user.id);
                if (!data) {
                    return interaction.reply({ content: 'Aktif bir bağlantın yok.', ephemeral: true });
                }

                try {
                    data.connection.destroy();
                    data.client.destroy();
                    activeConnections.delete(interaction.user.id);

                    // Dosyadan da sil
                    const saved = loadData();
                    delete saved[interaction.user.id];
                    saveData(saved);

                    await interaction.reply({ content: 'Bağlantı kesildi ve kayıt silindi.', ephemeral: true });
                } catch (err) {
                    console.error(err);
                    await interaction.reply({ content: 'Hata oluştu.', ephemeral: true });
                }
            }

            // Modal
            if (interaction.customId === 'voice_modal') {
                await interaction.deferReply({ ephemeral: true });

                const token = interaction.fields.getTextInputValue('bot_token').trim();
                const channelId = interaction.fields.getTextInputValue('channel_id').trim();

                try {
                    await connectVoice(interaction.user.id, token, channelId);

                    // Şifreleyip kaydet
                    const saved = loadData();
                    saved[interaction.user.id] = {
                        encryptedToken: encrypt(token),
                        channelId: channelId
                    };
                    saveData(saved);

                    await interaction.editReply('Başarıyla bağlandı! Token **şifrelenerek** kaydedildi.');
                } catch (err) {
                    console.error(err);
                    await interaction.editReply('Bağlantı kurulamadı. Token veya Kanal ID hatalı olabilir.');
                }
            }
        });

        // ======================
        //  BAĞLANTI FONKSİYONU
        // ======================
        async function connectVoice(userId, token, channelId) {
            // Eski bağlantıyı kapat
            if (activeConnections.has(userId)) {
                const old = activeConnections.get(userId);
                old.connection.destroy();
                old.client.destroy();
            }

            const botClient = new Client({
                intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
            });

            await botClient.login(token);

            return new Promise((resolve, reject) => {
                botClient.once('ready', async () => {
                    try {
                        const channel = await botClient.channels.fetch(channelId);
                        if (!channel || channel.type !== 2) {
                            botClient.destroy();
                            return reject(new Error('Geçersiz ses kanalı'));
                        }

                        const connection = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: channel.guild.id,
                            adapterCreator: channel.guild.voiceAdapterCreator,
                            selfDeaf: true,
                            selfMute: true
                        });

                        activeConnections.set(userId, { client: botClient, connection, channelId });

                        // Kopunca tekrar dene (basit)
                        connection.on(VoiceConnectionStatus.Disconnected, async () => {
                            try {
                                await Promise.race([
                                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                                ]);
                            } catch {
                                connection.destroy();
                            }
                        });

                        resolve();
                    } catch (err) {
                        botClient.destroy();
                        reject(err);
                    }
                });

                botClient.on('error', reject);
            });
        }
    }
};
