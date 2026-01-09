import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { TasksService } from '../tasks/tasks.service';
import { SpacesService } from '../spaces/spaces.service';
import { PrismaService } from '../prisma.service';
import { TaskType, TaskPriority } from '@doma/shared';

describe('BotService Wizard Flow', () => {
  let service: BotService;
  let tasksService: TasksService;
  let spacesService: SpacesService;
  let authService: AuthService;

  // Track the 'bot' instance listeners manually
  let listenerMap: Record<string, Function> = {};

  // Mock User & Space
  const mockUser = { id: 'user-123', name: 'Boris', role: 'EXECUTOR' };
  const mockSpace = { id: 'space-101', name: 'Room 101' };

  beforeEach(async () => {
    // Reset listener map
    listenerMap = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: ConfigService,
          useValue: { get: () => 'dummy_token' },
        },
        {
          provide: AuthService,
          useValue: { validateTelegramUser: jest.fn().mockResolvedValue(mockUser) },
        },
        {
          provide: TasksService,
          useValue: {
            findMyTasks: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'task-1' })
          },
        },
        {
          provide: SpacesService,
          useValue: { findAll: jest.fn().mockResolvedValue([mockSpace]) },
        },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    tasksService = module.get<TasksService>(TasksService);
    spacesService = module.get<SpacesService>(SpacesService);
    authService = module.get<AuthService>(AuthService);

    // STARTUP THE BOT TO REGISTER HANDLERS
    const bot = (service as any).bot;

    // MOCK NETWORK CALLS
    jest.spyOn(bot.api, 'getMe').mockResolvedValue({
      id: 12345,
      first_name: 'TestBot',
      is_bot: true,
      username: 'test_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false
    });

    jest.spyOn(bot, 'start').mockImplementation(() => Promise.resolve());
    if ((bot as any).init) {
      jest.spyOn(bot as any, 'init').mockImplementation(() => Promise.resolve());
    }

    // SPY ON LISTENERS
    jest.spyOn(bot, 'command').mockImplementation((cmd, handler) => {
      listenerMap[`command:${cmd}`] = handler as Function;
      return bot;
    });

    jest.spyOn(bot, 'on').mockImplementation((trigger, handler) => {
      listenerMap[`on:${trigger}`] = handler as Function;
      return bot;
    });

    // Initialize module to trigger setupCommands/Handlers
    await service.onModuleInit();
  });

  // Helper to create a Mock Context
  const createMockCtx = (session: any) => ({
    from: { id: 12345, first_name: 'Boris' },
    message: { text: '' },
    session,
    reply: jest.fn(),
    editMessageText: jest.fn(),
    answerCallbackQuery: jest.fn(),
    callbackQuery: { data: '' },
    user: mockUser, // Auth middleware usually sets this
  });

  it('should start a wizard when /create is sent', async () => {
    const session = { step: 'IDLE', tempTask: {} };
    const ctx = createMockCtx(session) as any;
    await listenerMap['command:create'](ctx);
    expect(session.step).toBe('CREATING_TITLE');
  });

  it('should handle TITLE input and ask for PRIORITY', async () => {
    const session = { step: 'CREATING_TITLE', tempTask: {} };
    const ctx = createMockCtx(session) as any;
    ctx.message.text = 'Broken Lamp';
    await listenerMap['on:message:text'](ctx);
    expect((session.tempTask as any).title).toBe('Broken Lamp');
    expect(session.step).toBe('IDLE');
  });

  it('should handle PRIORITY callback and ask for SPACE', async () => {
    const session = { step: 'IDLE', tempTask: { title: 'Broken Lamp' } };
    const ctx = createMockCtx(session) as any;
    ctx.callbackQuery = { data: 'PRIORITY_P1' };
    await listenerMap['on:callback_query:data'](ctx);
    expect((session.tempTask as any).priority).toBe('P1');
    expect(session.step).toBe('CREATING_SPACE');
  });

  it('should handle SPACE input and ask for GUEST IMPACT', async () => {
    const session = { step: 'CREATING_SPACE', tempTask: { title: 'Broken Lamp', priority: 'P1' } };
    const ctx = createMockCtx(session) as any;
    ctx.message.text = 'Room 101';
    await listenerMap['on:message:text'](ctx);
    expect((session.tempTask as any).spaceId).toBe('space-101');
    expect(session.step).toBe('IDLE');
  });

  it('should handle GUEST IMPACT callback and CREATE TASK', async () => {
    const session = {
      step: 'IDLE',
      tempTask: { title: 'Broken Lamp', priority: 'P1', spaceId: 'space-101' }
    };
    const ctx = createMockCtx(session) as any;
    ctx.callbackQuery = { data: 'GUEST_IMPACT_YES' };

    // Explicitly Log Call
    console.error('INVOKING CALLBACK HANDLER WITH GUEST_IMPACT_YES');

    try {
      await listenerMap['on:callback_query:data'](ctx);
    } catch (e) {
      console.error('HANDLER ERROR', e);
    }

    expect((session.tempTask as any).isGuestImpact).toBe(true);

    // Check if called
    if ((tasksService.create as jest.Mock).mock.calls.length === 0) {
      console.error('FAILURE: tasksService.create WAS NOT CALLED');
      fail('tasksService.create was not called');
    }

    const lastCallArgs = (tasksService.create as jest.Mock).mock.calls[0][0];
    console.error('ARGS:', JSON.stringify(lastCallArgs));

    expect(lastCallArgs.title).toBe('Broken Lamp');
    expect(lastCallArgs.priority).toBe('P1');
    expect(lastCallArgs.spaceId).toBe('space-101');
    expect(lastCallArgs.isGuestImpact).toBe(true);
    expect(lastCallArgs.reporterId).toBe('user-123');
    expect(lastCallArgs.type).toBe('MAINTENANCE');

    expect(ctx.reply).toHaveBeenCalledWith('✅ Task Created Successfully!');
  });
});
