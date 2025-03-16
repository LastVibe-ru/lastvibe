const { Client, GatewayIntentBits, Events, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TOKEN = 'MTM0NTYyMDA4NzE3NjAzNjQyMw.GDQwPZ.vtvjC_BzxIbU3XXB0k9zts3DmVE7Ed-T44NA3A';

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async message => {
    if (message.content === '!botBuild') {
        const button = new ButtonBuilder()
            .setCustomId('openModal')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
            .setTitle('👋 Добро пожаловать')
            .setDescription('Чтобы играть на сервере вам нужно подать заявку ниже')
            .setImage('https://cdn.discordapp.com/attachments/1299609343829737512/1345680608331956234/3195971296aa5178.jpg?ex=67c56e3a&is=67c41cba&hm=bce97493cef3c1c560486a4fcc94b2c435f5f747aa87e27eec2db58618681782&');

        await message.channel.send({ embeds: [embed], components: [row] });

        //await message.channel.send({ files: ['https://cdn.discordapp.com/attachments/1299609343829737512/1345680608331956234/3195971296aa5178.jpg?ex=67c56e3a&is=67c41cba&hm=bce97493cef3c1c560486a4fcc94b2c435f5f747aa87e27eec2db58618681782&'], content: '👋 Чтобы играть на сервере вам нужно подать заявку ниже', components: [row] });
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
                .setPlaceholder('karpen')
                .setStyle(TextInputStyle.Short);

            const ageInput = new TextInputBuilder()
                .setCustomId('age')
                .setLabel('Возраст/стаж в игре')
                .setPlaceholder('17/10 лет')
                .setStyle(TextInputStyle.Short);

            const otherServersInput = new TextInputBuilder()
                .setCustomId('other')
                .setLabel('Играли ли на подобных серверах')
                .setPlaceholder('Да / Нет ...')
                .setStyle(TextInputStyle.Short);

            const timeInput = new TextInputBuilder()
                .setCustomId('time')
                .setLabel('Сколько времени вы готовы уделять на сервер')
                .setPlaceholder('2 - 3 часа в день')
                .setStyle(TextInputStyle.Short);

            const unInput = new TextInputBuilder()
                .setCustomId('un')
                .setLabel('Почему мы должны взять именно вас')
                .setPlaceholder('Я хороший строитель, умею...')
                .setStyle(TextInputStyle.Paragraph)

                //const aboutInput = new TextInputBuilder()
                //.setCustomId('about')
                //.setLabel('Краткая информация о себе')
                //.setStyle(TextInputStyle.Paragraph);

            const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
            const secondActionRow = new ActionRowBuilder().addComponents(ageInput);
            //const thirdActionRow = new ActionRowBuilder().addComponents(aboutInput);
            const other = new ActionRowBuilder().addComponents(otherServersInput);
            const time = new ActionRowBuilder().addComponents(timeInput);
            const unicale = new ActionRowBuilder().addComponents(unInput);

            modal.addComponents(firstActionRow, secondActionRow, other, time, unicale);

            await interaction.showModal(modal);
        }

        // Обработка отправки модального окна
        if (interaction.isModalSubmit() && interaction.customId === 'sendModal') {
            const name = interaction.fields.getTextInputValue('name');
            const age = interaction.fields.getTextInputValue('age');
            //const about = interaction.fields.getTextInputValue('about');
            const other = interaction.fields.getTextInputValue('other');
            const unicale = interaction.fields.getTextInputValue('un');
            const time = interaction.fields.getTextInputValue('time');

            const member = interaction.guild.members.cache.get(interaction.user.id);
            const role = interaction.guild.roles.cache.find(r => r.name === 'waiting');
            if (role) {
                await member.roles.add(role).catch(console.error);
            }

            await member.setNickname(name);

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
                content: `Новая заявка от ${name}:\nВозраст: ${age}\nДругие сервера: ${other} \nВремя на сервер: ${time} \nЧто может дать серверу: ${unicale} \nID: ${interaction.user.id}`,
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

                const roleTwo = interaction.guild.roles.cache.find(r => r.name === 'waiting');
                if (roleTwo){
                    await member.roles.remove(roleTwo).catch(console.error);
                }

                const messageToDelete = interaction.message;
                await messageToDelete.delete().catch(console.error);

                const info = new ButtonBuilder()
                    .setCustomId('info')
                    .setLabel('Что дальше?')
                    .setStyle(ButtonStyle.Secondary)

                const row = new ActionRowBuilder().addComponents(info);

                await responseChannel.send({ content: `✅ Участник ${member.displayName} принят.`, components: [row] });
            } else if (interaction.customId === 'reject') {
                await interaction.reply({ content: 'Заявка отклонена!', ephemeral: true });
                const applicantId = interaction.message.content.split('ID: ')[1];

                const member = interaction.guild.members.cache.get(applicantId);
                const messageToDelete = interaction.message;

                const roleTwo = interaction.guild.roles.cache.find(r => r.name === 'waiting');
                if (roleTwo){
                    await member.roles.remove(roleTwo).catch(console.error);
                }

                const info = new ButtonBuilder()
                    .setCustomId('notAllowed')
                    .setLabel('Что делать?')
                    .setStyle(ButtonStyle.Secondary)

                const row = new ActionRowBuilder().addComponents(info);

                await messageToDelete.delete().catch(console.error);
                await responseChannel.send({ content: `❌ Участник ${member.displayName} не принят.`, components: [row] });
            } else if (interaction.customId === 'info'){
                await interaction.reply({ content: `Вы приняты, ваш ник добавлен в вайтлист, чтобы начать игру чиатйте <#1338192259010789526>`, ephemeral: true })
            } else if (interaction.customId === 'notAllowed'){
                await interaction.reply({ content: `Вашу заявку отклонили, но вы всегда можете купить проходку в <#1338192259010789526>, или подать заявку еще раз через некоторое время.`, ephemeral: true });
            }
        }

    } catch (error) {
        console.error('Modal error:', error);
        await interaction.reply({ content: 'Произошла ошибка. Попробуйте еще раз.', ephemeral: true });
    }
});

// Логин бота
client.login(TOKEN);
