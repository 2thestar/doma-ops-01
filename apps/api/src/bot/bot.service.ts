import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, session, SessionFlavor, Keyboard, InlineKeyboard } from 'grammy';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';
import { TasksService } from '../tasks/tasks.service';
import { SpacesService } from '../spaces/spaces.service';
import { User, TaskPriority, TaskType } from '@doma/shared';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { promisify } from 'util';

// Define Session Data
interface SessionData {
    step: 'IDLE' | 'CREATING_TITLE' | 'CREATING_SPACE' | 'CREATING_PHOTO';
    tempTask?: {
        title?: string;
        priority?: TaskPriority;
        spaceId?: string;
        isGuestImpact?: boolean;
        images?: string[];
    };
}

// Define Custom Context
type BotContext = Context & SessionFlavor<SessionData> & {
    user?: User;
};

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
    private bot: Bot<BotContext>;
    private supabase: SupabaseClient;
    private readonly logger = new Logger(BotService.name);

    constructor(
        private configService: ConfigService,
        private authService: AuthService,
        private tasksService: TasksService,
        private spacesService: SpacesService,
    ) {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        this.bot = new Bot<BotContext>(token || 'dummy_token');

        // Initialize Supabase
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        } else {
            this.logger.warn('Supabase credentials missing. Image upload will fail.');
        }
    }

    async onModuleInit() {
        this.setupMiddleware();
        this.setupCommands();
        this.setupHandlers();

        // Setup Menu
        await this.bot.api.setMyCommands([
            { command: 'create', description: '🆕 Report an Issue' },
            { command: 'mytasks', description: '📋 My Assigned Tasks' },
            { command: 'inspect', description: '🔍 Inspect Rooms' },
            { command: 'help', description: '❓ Help & Guide' },
            { command: 'cancel', description: '❌ Cancel Operation' },
        ]);

        if (this.configService.get('NODE_ENV') !== 'production') {
            this.bot.start({
                onStart: (botInfo) => {
                    this.logger.log(`Bot started as @${botInfo.username}`);
                },
            });
        }
    }

    async onModuleDestroy() {
        await this.bot.stop();
    }

    private setupMiddleware() {
        // Session Middleware
        this.bot.use(session({
            initial: (): SessionData => ({ step: 'IDLE', tempTask: {} }),
        }));

        // Auth Middleware
        this.bot.use(async (ctx, next) => {
            if (!ctx.from) return next();
            try {
                const user = await this.authService.validateTelegramUser(ctx.from.id.toString());
                ctx.user = user;
                return next();
            } catch (e) {
                if (ctx.message?.text === '/start') {
                    return next();
                }
                await ctx.reply('You are not authorized. Contact Admin to link your Telegram ID.');
            }
        });
    }

    private setupCommands() {
        this.bot.command('start', async (ctx) => {
            try {
                const user = await this.authService.validateTelegramUser(ctx.from!.id.toString());
                await ctx.reply(`Welcome back, ${user.name}!`);
            } catch {
                await ctx.reply(`Welcome! You are clearly new here. Your ID is: ${ctx.from!.id}. Ask an admin to add you.`);
            }
        });

        this.bot.command('mytasks', async (ctx) => {
            if (!ctx.user) return;
            const tasks = await this.tasksService.findMyTasks(ctx.user.id);
            if (tasks.length === 0) {
                await ctx.reply('No tasks assigned to you.');
            } else {
                const msg = tasks.map(t => {
                    const spaceName = t.space ? t.space.name : 'Unknown Location';
                    return `• *${t.title}* \n  📍 ${spaceName} | 🚦 ${t.priority} | Status: ${t.status}`;
                }).join('\n\n');
                await ctx.reply(`📋 *Your Assigned Tasks:*\n\n${msg}`, { parse_mode: 'Markdown' });
            }
        });

        this.bot.command('create', async (ctx) => {
            if (!ctx.user) return;
            ctx.session.step = 'CREATING_TITLE';
            ctx.session.tempTask = {};
            await ctx.reply('🆕 Create New Task\n\nPlease enter the *Task Title*:', { parse_mode: 'Markdown' });
        });

        this.bot.command('inspect', async (ctx) => {
            if (!ctx.user) return;

            const cleaningSpaces = await this.spacesService.findByStatus('CLEANING');

            if (cleaningSpaces.length === 0) {
                await ctx.reply('✅ No rooms currently need inspection (none are CLEANING).');
                return;
            }

            const keyboard = new InlineKeyboard();
            cleaningSpaces.forEach((space) => {
                keyboard.text(`🔍 ${space.name}`, `INSPECT_${space.id}`).row();
            });

            await ctx.reply('🧹 *Inspection Required*\nTap a room to mark it as **INSPECTED**:', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        this.bot.command('cancel', async (ctx) => {
            ctx.session.step = 'IDLE';
            ctx.session.tempTask = {};
            await ctx.reply('Operation cancelled.');
        });

        this.bot.command('help', async (ctx) => {
            const helpText = `
🤖 *DOMA Bot Help*

Here are the commands you can use:

🆕 */create* - Report a new issue or task.
📋 */mytasks* - View tasks assigned to you.
🔍 */inspect* - See rooms ready for inspection.
❌ */cancel* - Stop the current operation.

_Need more help? Contact your manager._
`;
            await ctx.reply(helpText, { parse_mode: 'Markdown' });
        });
    }

    private setupHandlers() {
        // Handle Text Inputs based on Step
        this.bot.on('message:text', async (ctx) => {
            if (!ctx.user) return;
            const text = ctx.message.text;
            const step = ctx.session.step;

            if (step === 'CREATING_TITLE') {
                ctx.session.tempTask!.title = text;
                ctx.session.step = 'IDLE'; // Pausing 'text' input flow for Inline Keyboard
                // Now ask for Priority
                const keyboard = new InlineKeyboard()
                    .text('🔴 P1 (Emergency)', 'PRIORITY_P1').row()
                    .text('🟠 P2 (Urgent)', 'PRIORITY_P2').row()
                    .text('🟢 P3 (Routine)', 'PRIORITY_P3');

                await ctx.reply(`Title: *${text}*\n\nSelect Priority:`, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }

            else if (step === 'CREATING_SPACE') {
                // Look up space by name
                const spaces = await this.spacesService.findAll(); // Optimization: Use a search query in later v2
                const matched = spaces.find(s => s.name.toLowerCase().includes(text.toLowerCase()) || s.id === text);

                if (!matched) {
                    await ctx.reply('❌ Space not found. Please try again (e.g. "101" or "Lobby").');
                    return;
                }

                ctx.session.tempTask!.spaceId = matched.id;

                // Ask for Guest Impact
                const keyboard = new InlineKeyboard()
                    .text('Yes, Guest Affected', 'GUEST_IMPACT_YES').row()
                    .text('No, BOH only', 'GUEST_IMPACT_NO');

                await ctx.reply(`Creating task for *${matched.name}*.\n\nIs this affecting a Guest?`, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                ctx.session.step = 'IDLE';
            }
        });

        // Handle Callback Queries (Inline Buttons)
        this.bot.on('callback_query:data', async (ctx) => {
            const data = ctx.callbackQuery.data;

            if (data.startsWith('INSPECT_')) {
                const spaceId = data.split('_')[1];
                try {
                    await this.spacesService.updateStatus(spaceId, 'INSPECTED');
                    await ctx.answerCallbackQuery('Room marked as INSPECTED');

                    const space = await this.spacesService.findOne(spaceId);
                    await ctx.editMessageText(`✅ **${space?.name}** passed inspection!`, { parse_mode: 'Markdown' });
                } catch (e) {
                    this.logger.error(e);
                    await ctx.answerCallbackQuery('Error updating status');
                }
            }

            if (data.startsWith('PRIORITY_')) {
                const priority = data.split('_')[1] as TaskPriority;
                ctx.session.tempTask!.priority = priority;

                await ctx.answerCallbackQuery();
                await ctx.editMessageText(`Priority set to: *${priority}*`, { parse_mode: 'Markdown' });

                ctx.session.step = 'CREATING_SPACE';
                await ctx.reply('Where is the issue? Enter *Space Name* or *Code* (e.g. "101"):', { parse_mode: 'Markdown' });
            }

            else if (data.startsWith('GUEST_IMPACT_')) {
                const isImpact = data === 'GUEST_IMPACT_YES';
                ctx.session.tempTask!.isGuestImpact = isImpact;

                // Asking for Photo instead of immediate creation
                await ctx.answerCallbackQuery();
                await ctx.editMessageText(`Guest Impact: ${isImpact ? 'YES' : 'NO'}`);

                ctx.session.step = 'CREATING_PHOTO';
                await ctx.reply('📸 **Add a Photo?**\nUpload an image now, or type /skip to finish.', { parse_mode: 'Markdown' });
            }
        });

        // Photo Handler
        this.bot.on('message:photo', async (ctx) => {
            if (ctx.session.step !== 'CREATING_PHOTO') return;

            const photo = ctx.message.photo.pop(); // Get highest res
            if (!photo) return;

            try {
                if (!this.supabase) throw new Error('Supabase not configured');

                const file = await ctx.api.getFile(photo.file_id);
                if (file.file_path) {
                    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
                    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

                    // Download image buffer
                    const response = await fetch(fileUrl);
                    if (!response.body) throw new Error('No body');

                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const fileName = `${Date.now()}_${photo.file_id}.jpg`;

                    // Upload to Supabase Storage
                    const { data, error } = await this.supabase
                        .storage
                        .from('task-images')
                        .upload(fileName, buffer, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });

                    if (error) throw error;

                    // Get Public URL
                    const { data: { publicUrl } } = this.supabase
                        .storage
                        .from('task-images')
                        .getPublicUrl(fileName);

                    ctx.session.tempTask!.images = [publicUrl];
                }

                await this.finalizeTask(ctx);
            } catch (e) {
                this.logger.error('Photo upload failed', e);
                await ctx.reply('Failed to upload photo to cloud. Task created without it.');
                await this.finalizeTask(ctx);
            }
        });

        // Skip Handler (text input during PHOTO step)
        this.bot.on('message:text', async (ctx) => {
            // ... check existing handlers first ...
            if (ctx.session.step === 'CREATING_PHOTO' && (ctx.message.text === '/skip' || ctx.message.text.toLowerCase() === 'skip')) {
                await this.finalizeTask(ctx);
                return;
            }
            // ... existing message:text logic
        });
    }

    private async finalizeTask(ctx: BotContext) {
        try {
            const draft = ctx.session.tempTask!;
            await this.tasksService.create({
                title: draft.title!,
                priority: draft.priority!,
                spaceId: draft.spaceId!,
                isGuestImpact: draft.isGuestImpact,
                images: draft.images || [],
                type: 'MAINTENANCE',
                reporterId: ctx.user!.id,
            });

            await ctx.reply('✅ Task Created Successfully!');
            ctx.session.step = 'IDLE';
            ctx.session.tempTask = {};
        } catch (e) {
            this.logger.error(e);
            await ctx.reply('❌ Error creating task. Please try again.');
        }
    }
}
