import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Request, Response } from 'express';

@Injectable()
export class OutlookStrategy extends PassportStrategy(Strategy, 'outlook') {
  private msalClient: ConfidentialClientApplication;

  constructor() {
    super();
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.OUTLOOK_CLIENT_ID,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
        authority: 'https://login.microsoftonline.com/common',
      },
    });
  }

  async validate(req: Request, res: Response, done: Function) {
    const authCodeUrlParameters = {
      scopes: ['openid', 'profile', 'email', 'Mail.Read', 'Mail.Send'],
      redirectUri: 'http://localhost:5000/auth/outlook/callback',
    };

    try {
      const authCodeUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authCodeUrl);
    } catch (error) {
      done(error, false);
    }
  }

  async handleCallback(req: Request, res: Response, done: Function) {
    const tokenRequest = {
      code: req.query.code as string,
      scopes: ['openid', 'profile', 'email', 'Mail.Read', 'Mail.Send'],
      redirectUri: 'http://localhost:5000/auth/outlook/callback',
    };

    try {
      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      const user = {
        email: response.account.username,
        accessToken: response.accessToken,
      };
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
