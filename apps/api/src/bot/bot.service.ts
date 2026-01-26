import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
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
    step: 'IDLE' | 'CREATING_TITLE' | 'CREATING_SPACE' | 'CREATING_PHOTO' | 'WAITING_FOR_NAME';
    tempTask?: {
        title?: string;
        priority?: TaskPriority;
        spaceId?: string;
        isGuestImpact?: boolean;
        images?: string[];
    };
    tempUser?: {
        telegramId?: string;
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
        @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
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
        // ... (rest of init) ...
        await this.bot.api.setMyCommands([
            { command: 'create', description: '🆕 Report an Issue' },
            { command: 'mytasks', description: '📋 My Assigned Tasks' },
            { command: 'inspect', description: '🔍 Inspect Rooms' },
            { command: 'help', description: '❓ Help & Guide' },
            { command: 'cancel', description: '❌ Cancel Operation' },
        ]);

        // Start the bot (Polling mode for MVP, even in prod)
        // Note: For high scale, switch to Webhooks (bot.handleUpdate)
        // Start Bot
        this.bot.start({
            allowed_updates: ['message', 'callback_query'],
        }).catch(err => {
            this.logger.error('Failed to start Telegram Bot (Polling Conflict or Network Error)', err);
            // We do not rethrow to prevent app crash.
            // In a rolling update scenario, the old pod will eventually die, releasing the conflict.
            // Ideally, we could retry after a delay, but for now we just log it.
        });

        // Set Menu Button to open the Web App
        // We use the Production URL because Telegram cannot access localhost without a tunnel.
        // User checks local changes by pushing to prod later.
        const webAppUrl = this.configService.get('WEB_APP_URL') || 'https://doma-web.onrender.com';

        try {
            await this.bot.api.setChatMenuButton({
                menu_button: {
                    type: 'web_app',
                    text: 'Open DOMA 🏠',
                    web_app: { url: webAppUrl },
                },
            });
            this.logger.log(`Menu Button set to: ${webAppUrl}`);
        } catch (e) {
            this.logger.warn('Failed to set Menu Button', e);
        }

        this.logger.log(`Bot started as @${this.bot.botInfo.username}`);
    }

    async notifyUser(userId: string, message: string) {
        try {
            // Find user to get Telegram ID
            // We use AuthService validation or direct DB lookup
            const user = await this.authService.validateTelegramUserByInternalId(userId);

            if (user && user.telegramId) {
                await this.bot.api.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
                this.logger.log(`Notification sent to user ${userId}`);
            } else {
                this.logger.warn(`User ${userId} has no connected Telegram ID.`);
            }
        } catch (e) {
            this.logger.error(`Failed to notify user ${userId}`, e);
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
            this.logger.debug(`Incoming update: ${ctx.update.update_id} | Type: ${Object.keys(ctx.update).join(',')}`);
            if (!ctx.from) return next();

            // Allow START command to pass through to handler
            if (ctx.message?.text === '/start') {
                return next();
            }

            // Allow Name Input during Onboarding
            if (ctx.session.step === 'WAITING_FOR_NAME') {
                return next();
            }

            try {
                // Try to validate user
                const user = await this.authService.validateTelegramUser(ctx.from.id.toString());
                this.logger.debug(`User found: ${user.name} (${user.role})`);

                // Check if Pending
                if (user.role === ('PENDING' as any)) {
                    await ctx.reply('⏳ **Account Pending Approval**\n\nYour request has been sent to the manager. You will be notified once approved.', { parse_mode: 'Markdown' });
                    return;
                }

                ctx.user = user as any;
                return next();
            } catch (e) {
                this.logger.warn(`User validation failed for ${ctx.from.id}: ${e.message}`);
                // User not found -> Trigger Onboarding
                if ((ctx.session.step as string) !== 'WAITING_FOR_NAME') {
                    ctx.session.step = 'WAITING_FOR_NAME';
                    await ctx.reply('👋 **Welcome to DOMA!**\n\nI don\'t recognize you yet.\n\nPlease reply with your **Full Name** to request access:', { parse_mode: 'Markdown' });
                }
            }
        });
    }

    private setupCommands() {
        this.bot.command('start', async (ctx) => {
            const telegramId = ctx.from!.id.toString();
            // Check for Deep Link (UUID)
            const payload = ctx.match; // The parameter after /start
            if (payload && payload.length > 10) { // Simple check, UUID is 36 chars
                try {
                    const linkedUser = await this.authService.linkTelegramUser(payload, telegramId) as any;
                    if (!linkedUser) {
                        await ctx.reply('⚠️ **Link Failed**\n\nInvalid link or user not found.');
                        return;
                    }
                    await ctx.reply(`🔗 **Account Linked!**\n\nYou are now connected as **${linkedUser.name}**.\nRole: ${linkedUser.role}\nTeam: ${linkedUser.department || 'None'}`, { parse_mode: 'Markdown' });
                    // Refresh session user
                    ctx.user = linkedUser;
                    return;
                } catch (e) {
                    await ctx.reply('⚠️ **Link Failed**\n\nInvalid link or user not found.');
                }
            }

            try {
                const user = await this.authService.validateTelegramUser(telegramId);
                const webAppUrl = this.configService.get('WEB_APP_URL') || 'https://doma-web.onrender.com';
                const keyboard = new Keyboard().webApp('🏠 Open DOMA App', webAppUrl).resized();

                await ctx.reply(`👋 Welcome back, ${user.name}!\n\nTAP BELOW to launch DOMA.`, {
                    reply_markup: keyboard
                });
            } catch {
                // User unknown -> Start Onboarding
                ctx.session.step = 'WAITING_FOR_NAME';
                await ctx.reply('👋 **Welcome to DOMA!**\n\nI don\'t recognize you yet.\n\nPlease reply with your **Full Name** to request access (or use the Invite Link from your Manager).', { parse_mode: 'Markdown' });
            }
        });

        this.bot.command('mytasks', async (ctx) => {
            if (!ctx.user) return;
            const tasks = await this.tasksService.findAll({ assigneeId: ctx.user.id });
            if (tasks.length === 0) {
                await ctx.reply('👍 All clean! No tasks assigned.');
                return;
            }
            const msg = tasks.map(t => {
                const spaceName = t.space ? t.space.name : 'Unknown Location';
                return `• *${t.title}* \n  📍 ${spaceName} | 🚦 ${t.priority} | Status: ${t.status}`;
            }).join('\n\n');
            await ctx.reply(`📋 *Your Assigned Tasks:*\n\n${msg}`, { parse_mode: 'Markdown' });
        });

        this.bot.command('create', async (ctx) => {
            this.logger.debug(`Command /create triggered by ${ctx.from?.id}`);
            if (!ctx.user) {
                this.logger.warn('Command /create blocked: No authenticated user.');
                return;
            }
            ctx.session.step = 'CREATING_TITLE';
            ctx.session.tempTask = {};
            await ctx.reply('🆕 [LOCAL] Create New Task\n\nPlease enter the *Task Title*:', { parse_mode: 'Markdown' });
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
            if (!ctx.from) return;
            const text = ctx.message.text;
            const step = ctx.session.step;

            // --- ONBOARDING FLOW ---
            if (step === 'WAITING_FOR_NAME') {
                try {
                    // 1. Try to Link to existing seeded user
                    const linkedUser = await this.authService.linkUserByName(ctx.from.id.toString(), text);

                    if (linkedUser) {
                        ctx.session.step = 'IDLE';
                        const webAppUrl = this.configService.get('WEB_APP_URL') || 'https://doma-web.onrender.com';
                        const keyboard = new Keyboard().webApp('🏠 Open DOMA App', webAppUrl).resized();

                        await ctx.reply(`✅ **Account Linked!**\n\nWelcome back, **${linkedUser.name}**.\nTap below to open the app.`, {
                            parse_mode: 'Markdown',
                            reply_markup: keyboard
                        });
                        // Refresh ctx.user for this session
                        ctx.user = linkedUser as any;
                    } else {
                        // 2. Fallback: Create PENDING user
                        await this.authService.registerPendingUser(ctx.from.id.toString(), text);

                        ctx.session.step = 'IDLE';
                        await ctx.reply(`✅ **Request Sent!**\n\nName: *${text}*\nID: \`${ctx.from.id}\`\n\nAn admin will review your request shortly.`, { parse_mode: 'Markdown' });
                    }
                } catch (e: any) {
                    this.logger.error('Registration failed', e);
                    await ctx.reply(`❌ Error registering: ${e.message || e}`);
                }
                return;
            }

            // --- AUTH CHECK FOR OTHER ACTIONS ---
            // If we reached here, middleware should have attached ctx.user (unless it failed/pending)
            // But confirming just in case logic slips
            if (!ctx.user) return;

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
