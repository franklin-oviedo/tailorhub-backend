import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type CalendarEventInput = {
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class GoogleCalendarService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async linkCalendarToUser(
    userId: string,
    authorizationCode: string,
    expectedEmail?: string,
    redirectUriInput?: string,
  ): Promise<{ calendarEmail: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const redirectUri =
      redirectUriInput ?? this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI');

    if (!redirectUri) {
      throw new BadRequestException('GOOGLE_OAUTH_REDIRECT_URI is not configured.');
    }

    const tokenResponse = await this.exchangeAuthorizationCode(authorizationCode, redirectUri);
    const refreshToken = tokenResponse.refresh_token ?? user.googleRefreshToken;

    if (!refreshToken) {
      throw new BadRequestException(
        'Google did not return a refresh token. Request consent with access_type=offline and prompt=consent.',
      );
    }

    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      throw new BadRequestException('Google token exchange did not return an access token.');
    }

    const calendarEmail = await this.getGoogleUserEmail(accessToken);

    if (expectedEmail && calendarEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new BadRequestException(
        'Google account email does not match the authenticated TailorHub user email.',
      );
    }

    user.googleRefreshToken = refreshToken;
    user.googleCalendarEmail = calendarEmail;
    await this.usersRepository.save(user);

    return { calendarEmail };
  }

  async createAppointmentEventForUser(
    userId: string,
    input: CalendarEventInput,
  ): Promise<{ eventId: string }> {
    const accessToken = await this.getAccessTokenForUser(userId);
    const timezone = this.configService.get<string>('GOOGLE_CALENDAR_TIMEZONE', 'UTC');

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description ?? null,
        start: { dateTime: input.startAt.toISOString(), timeZone: timezone },
        end: { dateTime: input.endAt.toISOString(), timeZone: timezone },
      }),
    });

    if (!response.ok) {
      const rawError = await response.text();
      throw new BadRequestException(
        `Unable to create Google Calendar event. ${rawError || 'Unknown Google Calendar error.'}`,
      );
    }

    const payload = (await response.json()) as { id?: string };
    if (!payload.id) {
      throw new BadRequestException('Google Calendar did not return an event id.');
    }

    return { eventId: payload.id };
  }

  async cancelAppointmentEventForUser(userId: string, eventId: string): Promise<void> {
    const accessToken = await this.getAccessTokenForUser(userId);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404 || response.status === 410) {
      return;
    }

    if (!response.ok) {
      const rawError = await response.text();
      throw new BadRequestException(
        `Unable to cancel Google Calendar event. ${rawError || 'Unknown Google Calendar error.'}`,
      );
    }
  }

  private async getAccessTokenForUser(userId: string): Promise<string> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user?.googleRefreshToken) {
      throw new BadRequestException(
        'Google Calendar is not linked for this user. Link the account before scheduling appointments.',
      );
    }

    const tokenResponse = await this.refreshAccessToken(user.googleRefreshToken);

    if (!tokenResponse.access_token) {
      throw new BadRequestException('Google refresh flow did not return an access token.');
    }

    return tokenResponse.access_token;
  }

  private async getGoogleUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Unable to fetch Google user profile for calendar linking.');
    }

    const payload = (await response.json()) as { email?: string; email_verified?: boolean };

    if (!payload.email || payload.email_verified === false) {
      throw new BadRequestException('Google account email is missing or not verified.');
    }

    return payload.email;
  }

  private async exchangeAuthorizationCode(
    authorizationCode: string,
    redirectUri: string,
  ): Promise<GoogleTokenResponse> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured for calendar linking.',
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const payload = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || payload.error) {
      throw new BadRequestException(
        `Google authorization code exchange failed: ${payload.error_description ?? payload.error ?? 'unknown error'}`,
      );
    }

    return payload;
  }

  private async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured for calendar access.',
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const payload = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || payload.error) {
      throw new BadRequestException(
        `Google refresh token exchange failed: ${payload.error_description ?? payload.error ?? 'unknown error'}`,
      );
    }

    return payload;
  }
}
