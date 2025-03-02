const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TOKEN = 'MTM0NTYyMDA4NzE3NjAzNjQyMw.GDQwPZ.vtvjC_BzxIbU3XXB0k9zts3DmVE7Ed-T44NA3A';

client.once(Events.ClientReady, () => {
    client.user.setActivity('Заявки', { type: 'WATCHING' });

    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async message => {
    if (message.content === '!botBuild') {
        const button = new ButtonBuilder()
            .setCustomId('openModal')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ content: 'Чтобы играть на сервере вам нужно подать заявку ниже', components: [row] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.customId === 'openModal') {
            const modal = new ModalBuilder()
                .setCustomId('sendModal')
                .setTitle('Ответьте на пару вопросов');

            const nameInput = new TextInputBuilder()
                .setCustomId('name')
                .setLabel('Игровой никнейм')
                .setStyle(TextInputStyle.Short);

            const ageInput = new TextInputBuilder()
                .setCustomId('age')
                .setLabel('Возраст')
                .setStyle(TextInputStyle.Short);

            const aboutInput = new TextInputBuilder()
                .setCustomId('about')
                .setLabel('О себе')
                .setStyle(TextInputStyle.Paragraph);

            const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(ageInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(aboutInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

            await interaction.showModal(modal);
        }

        // Обработка отправки модального окна
        if (interaction.isModalSubmit() && interaction.customId === 'sendModal') {
            const name = interaction.fields.getTextInputValue('name');
            const age = interaction.fields.getTextInputValue('age');
            const about = interaction.fields.getTextInputValue('about');

            // Отправка заявки в другой канал
            const applicationChannel = client.channels.cache.get('1345627267119714367'); // Замените на ID канала
            const acceptButton = new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('Принять')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId('reject')
                .setLabel('Отклонить')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

            await applicationChannel.send({
                content: `Новая заявка от ${name}:\nВозраст: ${age}\nО себе: ${about} \nID: ${interaction.user.id}`,
                components: [row],
            });

            await interaction.reply({ content: 'Ваша заявка отправлена!', ephemeral: true });
        }

        // Обработка нажатий на кнопки
        if (interaction.isButton()) {
            const responseChannel = client.channels.cache.get('1345627664760963174');

            if (interaction.customId === 'accept') {
                await interaction.reply({ content: 'Заявка принята!', ephemeral: true });
                const applicantId = interaction.message.content.split('ID: ')[1];
                const member = interaction.guild.members.cache.get(applicantId);
                const role = interaction.guild.roles.cache.find(r => r.name === 'Player');
                if (role) {
                    await member.roles.add(role).catch(console.error);
                }
                const messageToDelete = interaction.message;
                await messageToDelete.delete().catch(console.error);
                await responseChannel.send(`Участник ${member.displayName} принят.`);
            } else if (interaction.customId === 'reject') {
                await interaction.reply({ content: 'Заявка отклонена!', ephemeral: true });
                const applicantId = interaction.message.content.split('ID: ')[1];
                const member = interaction.guild.members.cache.get(applicantId);
                const messageToDelete = interaction.message;
                await messageToDelete.delete().catch(console.error);
                await responseChannel.send(`Участник ${member.displayName} отклонен.`);
            }
        }

    } catch (error) {
        console.error('Modal error:', error);
        await interaction.reply({ content: 'Произошла ошибка. Попробуйте еще раз.', ephemeral: true });
    }
});

// Логин бота
client.login(TOKEN);
