import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkGoogleCalendarDto } from './dto/link-google-calendar.dto';
import { AcceptGoogleInvitationDto } from './dto/accept-google-invitation.dto';
import { AccessTokenResponseDto } from './dto/access-token-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a user in a store' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User registered successfully.',
    type: AccessTokenResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error, duplicate email, or invalid store.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Login successful.',
    type: AccessTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login or register with Google Identity Services' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiCreatedResponse({
    description: 'Google authentication successful.',
    type: AccessTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired Google token.' })
  @ApiBadRequestResponse({ description: 'Validation error or missing configuration.' })
  loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto);
  }

  @Post('google/calendar/link')
  @UseGuards(JwtAuthGuard)
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer access token from TailorHub login.',
    required: true,
  })
  @ApiOperation({ summary: 'Link Google Calendar to the authenticated TailorHub user' })
  @ApiBody({ type: LinkGoogleCalendarDto })
  @ApiCreatedResponse({
    description: 'Google Calendar linked successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiBadRequestResponse({ description: 'Google linking failed or account mismatch.' })
  linkGoogleCalendar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LinkGoogleCalendarDto,
  ) {
    return this.authService.linkGoogleCalendar(user, dto);
  }

  @Post('google/invitations/accept')
  @ApiOperation({ summary: 'Accept employee/manager invitation with Google account' })
  @ApiBody({ type: AcceptGoogleInvitationDto })
  @ApiCreatedResponse({
    description: 'Invitation accepted and TailorHub login completed.',
    type: AccessTokenResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invitation is invalid, expired, or does not match email.' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google token or inactive user.' })
  acceptGoogleInvitation(@Body() dto: AcceptGoogleInvitationDto) {
    return this.authService.acceptGoogleInvitation(dto);
  }
}
