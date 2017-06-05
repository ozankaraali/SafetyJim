import { Command, SafetyJim } from '../../safetyjim/safetyjim';
import * as Discord from 'discord.js';

class Kick implements Command {
    public usage = 'kick @user [reason] - Kicks the user with the specified reason';

    // tslint:disable-next-line:no-empty
    constructor(bot: SafetyJim) {}

    public run(bot: SafetyJim, msg: Discord.Message, args: string): boolean {
        this.runAsync(bot, msg, args);
        return;
    }

    private async runAsync(bot: SafetyJim, msg: Discord.Message, args: string): Promise<void> {
        args = args.split(' ').slice(1).join(' ');

        if (msg.mentions.users.size === 0) {
            msg.channel.send('You need to mention the user to kick.');
            return;
        }

        let member = msg.guild.member(msg.mentions.users.first());

        if (!member || !member.kickable || msg.member.highestRole.comparePositionTo(member.highestRole) <= 0) {
            msg.channel.send('The specified member is not kickable.');
            return;
        }

        let reason = args || 'No reason specified';

        bot.log.info(`Kicked user "${member.user.tag}" in "${msg.guild.name}".`);
        // Audit log compatibility :) (Known Caveat: sometimes reason won't appear, or add if reason has symbols.)
        // tslint:disable-next-line:max-line-length
        member.send(`**Time out!** You have been kicked from ${msg.guild.name}.\n\n**Kicked by:** ${msg.author.tag}\n\n**Reason:** ${reason}`)
              .then(() => { member.kick(reason); });

        bot.database.createUserKick(member.user, msg.author, msg.guild, reason);

        let db = await bot.database.getGuildConfiguration(msg.guild);
        let prefix = await bot.database.getGuildPrefix(msg.guild);

        if (!db  || !db.ModLogActive) {
            return;
        }

        if (!bot.client.channels.has(db.ModLogChannelID) ||
            bot.client.channels.get(db.ModLogChannelID).type !== 'text') {
            msg.channel.send('Invalid channel in guild configuration, set a proper one via `prefix settings` command.');
            return;
        }

        let logChannel = bot.client.channels.get(db.ModLogChannelID) as Discord.TextChannel;

        let embed = {
            color: 0xFF9900, // orange
            fields: [
                { name: 'Action:', value: 'Kick', inline: false },
                { name: 'User:', value: member.user.tag, inline: false },
                { name: 'Reason:', value: reason, inline: false },
                { name: 'Responsible Moderator:', value: msg.author.tag, inline: false },
            ],
            timestamp: new Date(),
        };

        logChannel.send({ embed });

        return;
    }

}
module.exports = Kick;
