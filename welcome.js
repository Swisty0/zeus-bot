const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'welcome',
    
    /**
     * @param {import('discord.js').Client} client 
     */
    execute(client) {
        client.on('guildMemberAdd', async (member) => {
            // ========== AYARLAR ==========
            const welcomeChannelId = '1551582335332261920'; // Hoş geldin mesajının gideceği kanal
            const welcomeRoleId = null; // Otomatik rol vermek istersen rol ID'sini yaz (yoksa null bırak)
            const rulesChannelId = null; // Kurallar kanalı varsa ID'sini yaz
            // =============================

            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (!channel) return console.log('Welcome kanalı bulunamadı!');

            // Otomatik rol ver
            if (welcomeRoleId) {
                const role = member.guild.roles.cache.get(welcomeRoleId);
                if (role) {
                    try {
                        await member.roles.add(role);
                    } catch (err) {
                        console.error('Rol verilemedi:', err);
                    }
                }
            }

            // Embed
            const embed = new EmbedBuilder()
                .setColor(0x57F287) // Yeşil
                .setTitle(`<a:galp5:1551584348463956040> Aramıza katıldı ${member.user.username}! `)
                .setDescription(
                    `${member.user.username}! Sunucumuza Hoş Geldin\n\n` +
                    `Toplam **${member.guild.memberCount}** kişiyiz.`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setImage(member.guild.bannerURL({ size: 1024 }) || null)
                .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
                .setTimestamp();

            // Butonlar (isteğe bağlı)
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Kuralları Oku')
                    .setStyle(ButtonStyle.Link)
                    .setURL(rulesChannelId ? `https://discord.com/channels/${member.guild.id}/${rulesChannelId}` : 'https://discord.com')
                    .setEmoji('📜'),
                new ButtonBuilder()
                    .setLabel('Sunucu')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${member.guild.id}`)
                    .setEmoji('🏠')
            );

            try {
                await channel.send({
                    content: `Hoş geldin ${member}!`,
                    embeds: [embed],
                    components: rulesChannelId ? [row] : []
                });
            } catch (err) {
                console.error('Welcome mesajı gönderilemedi:', err);
            }
        });
    }
};