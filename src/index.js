const { Client, GatewayIntentBits, Events, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error) {
    console.error('Ошибка загрузки конфига:', error);
    process.exit(1);
}

if (!config.discord_api) {
    console.error('Токен Discord API не найден в конфиге');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const tempStorage = new Map();

client.once(Events.ClientReady, () => {
    console.log(`Бот запущен как ${client.user.tag}`);
    console.log(`Пригласительная ссылка: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands`);
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '!botBuild') {
        try {
            const button = new ButtonBuilder()
                .setCustomId('openModal')
                .setLabel('Подать заявку')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            const embed = new EmbedBuilder()
                .setTitle('👋 Добро пожаловать')
                .setDescription('Чтобы играть на сервере вам нужно подать заявку ниже')
                .setImage('https://cdn.discordapp.com/attachments/1299609343829737512/1345680608331956234/3195971296aa5178.jpg');

            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Ошибка при создании сообщения с кнопкой:', error);
        }
    }
});

async function handleApplicationModal(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('sendModal')
            .setTitle('Ответьте на пару вопросов');

        const fields = [
            { id: 'name', label: 'Игровой никнейм', placeholder: 'karpen', style: TextInputStyle.Short },
            { id: 'age', label: 'Возраст/стаж в игре', placeholder: '17/10 лет', style: TextInputStyle.Short },
            { id: 'other', label: 'Играли ли на подобных серверах', placeholder: 'Да / Нет ...', style: TextInputStyle.Short },
            { id: 'time', label: 'Сколько времени вы готовы уделять на сервер', placeholder: '2 - 3 часа в день', style: TextInputStyle.Short },
            { id: 'un', label: 'Почему мы должны взять именно вас', placeholder: 'Я хороший строитель, умею...', style: TextInputStyle.Paragraph }
        ];

        fields.forEach(field => {
            const input = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setPlaceholder(field.placeholder)
                .setStyle(field.style);

            const row = new ActionRowBuilder().addComponents(input);
            modal.addComponents(row);
        });

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Ошибка при показе модального окна:', error);
        await interaction.reply({ content: 'Произошла ошибка при открытии формы.', ephemeral: true });
    }
}

async function handleSubmittedApplication(interaction) {
    try {
        const name = interaction.fields.getTextInputValue('name');
        const age = interaction.fields.getTextInputValue('age');
        const other = interaction.fields.getTextInputValue('other');
        const unique = interaction.fields.getTextInputValue('un');
        const time = interaction.fields.getTextInputValue('time');

        const member = await interaction.guild.members.fetch(interaction.user.id);

        try {
            await member.setNickname(name);
        } catch (error) {
            console.error('Не удалось изменить никнейм:', error);
        }

        const waitingRole = interaction.guild.roles.cache.find(r => r.name === 'waiting');
        if (waitingRole) {
            try {
                await member.roles.add(waitingRole);
            } catch (error) {
                console.error('Не удалось добавить роль ожидания:', error);
            }
        }

        const applicationChannel = client.channels.cache.get(config.application_chan);
        if (!applicationChannel) {
            throw new Error('Канал для заявок не найден');
        }

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
            content: `Новая заявка от ${interaction.user} (${name}):\n` +
                `Возраст: ${age}\n` +
                `Другие сервера: ${other}\n` +
                `Время на сервер: ${time}\n` +
                `Что может дать серверу: ${unique}\n` +
                `ID: ${interaction.user.id}`,
            components: [row],
        });

        await interaction.reply({ content: 'Ваша заявка отправлена на рассмотрение!', ephemeral: true });
    } catch (error) {
        console.error('Ошибка при обработке заявки:', error);
        await interaction.reply({ content: 'Произошла ошибка при отправке заявки.', ephemeral: true });
    }
}

async function handleAcceptApplication(interaction) {
    try {
        const content = interaction.message.content;
        const applicantId = content.match(/ID: (\d+)/)?.[1];

        if (!applicantId) {
            throw new Error('Не удалось извлечь ID пользователя из сообщения');
        }

        const member = await interaction.guild.members.fetch(applicantId);

        const res = await fetch(`http://localhost:9010/api/allow?name=${member.displayName}&key=${config.api_key}`);
        if (!res.ok){
            console.error("Failed fetch");
        }

        const data = res.text();

        if (data !== "Success"){
            console.error("Filed add to whitelist");
        }

        const playerRole = interaction.guild.roles.cache.find(r => r.name === 'Player');
        if (playerRole) {
            await member.roles.add(playerRole);
        }

        const waitingRole = interaction.guild.roles.cache.find(r => r.name === 'waiting');
        if (waitingRole) {
            await member.roles.remove(waitingRole);
        }

        await interaction.message.delete();

        const responseChannel = client.channels.cache.get(config.res_chan);
        if (responseChannel) {
            const infoButton = new ButtonBuilder()
                .setCustomId(`info_${applicantId}`)
                .setLabel('Что дальше?')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(infoButton);

            await responseChannel.send({
                content: `✅ Участник ${member.toString()} принят.`,
                components: [row]
            });
        }

        await interaction.reply({ content: 'Заявка принята!', ephemeral: true });
    } catch (error) {
        console.error('Ошибка при принятии заявки:', error);
        await interaction.reply({ content: 'Произошла ошибка при принятии заявки.', ephemeral: true });
    }
}

async function handleRejectApplication(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('rejectModal')
            .setTitle('Отклонение заявки');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Вы не подходите, потому что...')
            .setLabel('Причина отказа')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        tempStorage.set(interaction.user.id, {
            messageId: interaction.message.id
        });

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Ошибка при создании модального окна отклонения:', error);
        await interaction.reply({ content: 'Произошла ошибка при попытке отклонить заявку.', ephemeral: true });
    }
}

async function handleRejectModal(interaction) {
    try {
        const reason = interaction.fields.getTextInputValue('reason');
        const storedData = tempStorage.get(interaction.user.id);

        if (!storedData) {
            throw new Error('Не найдены данные для обработки отклонения');
        }

        const applicationMessage = await interaction.channel.messages.fetch(storedData.messageId);
        const content = applicationMessage.content;
        const applicantId = content.match(/ID: (\d+)/)?.[1];

        if (!applicantId) {
            throw new Error('Не удалось извлечь ID пользователя из сообщения');
        }

        const member = await interaction.guild.members.fetch(applicantId);

        const waitingRole = interaction.guild.roles.cache.find(r => r.name === 'waiting');
        if (waitingRole) {
            await member.roles.remove(waitingRole);
        }

        await applicationMessage.delete();

        const responseChannel = client.channels.cache.get(config.res_chan);
        if (responseChannel) {
            tempStorage.set(applicantId, { reason });

            const infoButton = new ButtonBuilder()
                .setCustomId(`rejectReason_${applicantId}`)
                .setLabel('Причина отказа')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(infoButton);

            await responseChannel.send({
                content: `❌ Участник ${member.toString()} не принят.`,
                components: [row]
            });
        }

        await interaction.reply({ content: 'Заявка отклонена!', ephemeral: true });
        tempStorage.delete(interaction.user.id);
    } catch (error) {
        console.error('Ошибка при обработке отклонения:', error);
        await interaction.reply({ content: 'Произошла ошибка при отклонении заявки.', ephemeral: true });
    }
}

async function handleInfoButton(interaction) {
    try {
        const [action, userId] = interaction.customId.split('_');

        if (action === 'info') {
            await interaction.reply({
                content: `Вы приняты, ваш ник добавлен в вайтлист, чтобы начать игру читайте <#1338192259010789526>`,
                ephemeral: true
            });
        } else if (action === 'rejectReason') {
            const storedData = tempStorage.get(userId);
            if (storedData?.reason) {
                await interaction.reply({
                    content: `Причина отказа: ${storedData.reason}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Причина отказа не указана.',
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error('Ошибка при обработке информационной кнопки:', error);
        await interaction.reply({ content: 'Произошла ошибка при получении информации.', ephemeral: true });
    }
}

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isButton() && interaction.customId === 'openModal') {
            if (config.allowed === false) {
                await interaction.reply({ content: 'Подача заявок временно приостановлена.', ephemeral: true });
            } else {
                await handleApplicationModal(interaction);
            }
        }
        else if (interaction.isModalSubmit() && interaction.customId === 'sendModal') {
            await handleSubmittedApplication(interaction);
        }
        else if (interaction.isButton() && interaction.customId === 'accept') {
            await handleAcceptApplication(interaction);
        }
        else if (interaction.isButton() && interaction.customId === 'reject') {
            await handleRejectApplication(interaction);
        }
        else if (interaction.isModalSubmit() && interaction.customId === 'rejectModal') {
            await handleRejectModal(interaction);
        }
        else if (interaction.isButton() && (interaction.customId.startsWith('info_') || interaction.customId.startsWith('rejectReason_'))) {
            await handleInfoButton(interaction);
        }
    } catch (error) {
        console.error('Необработанная ошибка в InteractionCreate:', error);
        if (interaction.isRepliable()) {
            await interaction.reply({ content: 'Произошла непредвиденная ошибка.', ephemeral: true });
        }
    }
});

client.login(config.discord_api).catch(error => {
    console.error('Ошибка входа:', error);
    process.exit(1);
});

process.on('unhandledRejection', error => {
    console.error('Необработанное обещание:', error);
});