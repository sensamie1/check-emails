import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { OutlookStrategy } from './outlook.strategy';
import { OpenAIService } from './openai.service';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';

@Controller()
export class AppController {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly outlookStrategy: OutlookStrategy,
    private readonly openAIService: OpenAIService,
    private readonly emailService: EmailService,
    private readonly emailProcessor: EmailProcessor,
  ) {}

  @Get()
  getHello(): string {
    return 'Welcome to Check Emails!';
  }

  @Get('login')
  getLoginPage(@Req() req: Request, @Res() res: Response) {
    if (req.cookies.user_jwt) {
      return res.redirect('/user-home');
    } else {
      return res.render('login', { user: res.locals.user });
    }
  }

  @Get('auth/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    const { user } = req;
  }

  @Get('auth/google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const { user } = req;
    // Save user data and tokens
    res.redirect('/user-home');
  }

  @Get('auth/outlook')
  async outlookAuth(@Req() req, @Res() res: Response) {
    await this.outlookStrategy.validate(req, res, (err, user) => {
      if (err) {
        return res.redirect('/login');
      }
      req.logIn(user, err => {
        if (err) {
          return res.redirect('/login');
        }
        res.redirect('/user-home');
      });
    });
  }

  @Get('auth/outlook/callback')
  async outlookAuthCallback(@Req() req, @Res() res: Response) {
    await this.outlookStrategy.handleCallback(req, res, (err, user) => {
      if (err) {
        return res.redirect('/login');
      }
      req.logIn(user, err => {
        if (err) {
          return res.redirect('/login');
        }
        res.redirect('/user-home');
      });
    });
  }

  @Get('user-home')
  async getUserHome(@Res() res: Response) {
    try {
      const jobs = await this.emailQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
      const jobsWithState = await Promise.all(
        jobs.map(async job => ({
          id: job.id,
          name: job.name,
          state: await job.getState(),  // Use getState() to get the state of the job
        }))
      );
      res.render('user-home', { user: res.locals.user, jobs: jobsWithState });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('user_jwt');
    res.redirect('/login');
  }

  @Get('process-emails')
  async processEmails() {
    // Fetch emails from Gmail and Outlook
    const gmailEmails = await this.emailService.fetchEmails('gmail', 'me');
    const outlookEmails = await this.emailService.fetchEmails('outlook', 'me');

    // Queue email processing tasks for Gmail emails
    for (const email of gmailEmails) {
      await this.emailQueue.add('process-email', { service: 'gmail', emailId: email.id, content: email.content });
    }

    // Queue email processing tasks for Outlook emails
    for (const email of outlookEmails) {
      await this.emailQueue.add('process-email', { service: 'outlook', emailId: email.id, content: email.content });
    }

    return { message: 'Emails are being processed' };
  }
}
