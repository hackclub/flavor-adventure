import {v4} from 'uuid';
import axios from 'axios';
import type {Request, Response} from 'express';
import {HACK_CLUB_CLIENT_ID, HACK_CLUB_CLIENT_SECRET, OPID_CLIENT_REDIRECT_URL} from '../enums/EnvironmentVariable';

export class HackClubAuthClient {
	private readonly authUrl = 'https://auth.hackclub.com/oauth/authorize';
	private readonly tokenUrl = 'https://auth.hackclub.com/oauth/token';
	private readonly userInfoUrl = 'https://auth.hackclub.com/api/v1/me';

	public authorizationUrl(
		res: Response,
		playUri: string,
		req: Request,
		manuallyTriggered: 'true' | undefined,
		chatRoomId: string | undefined,
		providerId: string | undefined,
		providerScopes: string[] | undefined
	): string {
		if (!HACK_CLUB_CLIENT_ID) {
			console.error('HACK_CLUB_CLIENT_ID is missing in authorizationUrl');
			throw new Error('Hack Club Client ID is not configured');
		}

		const state = v4();
		res.cookie('oidc_state', state, {
			httpOnly: true,
			secure: req.secure,
		});

		const redirectUri = this.getRedirectUrl();

		const url = new URL(this.authUrl);
		url.searchParams.set('client_id', HACK_CLUB_CLIENT_ID);
		url.searchParams.set('redirect_uri', redirectUri);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', 'openid profile email name slack_id verification_status');
		url.searchParams.set('state', state);

		return url.toString();
	}

	private getRedirectUrl(): string {
		// Construct callback URL based on the base PUSHER_URL
		const baseUrl = new URL(OPID_CLIENT_REDIRECT_URL).origin;
		return `${baseUrl}/auth/hackclub/callback`;
	}

	public async exchangeCode(code: string): Promise<string> {
		if (!HACK_CLUB_CLIENT_ID || !HACK_CLUB_CLIENT_SECRET) {
			throw new Error('Hack Club Client ID or Secret not configured');
		}

		const params = new URLSearchParams();
		params.append('client_id', HACK_CLUB_CLIENT_ID);
		params.append('client_secret', HACK_CLUB_CLIENT_SECRET);
		params.append('redirect_uri', this.getRedirectUrl());
		params.append('code', code);
		params.append('grant_type', 'authorization_code');

		const response = await axios.post(this.tokenUrl, params, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		return response.data.access_token;
	}

	public async getUserInfo(accessToken: string): Promise<{
		sub: string; // We'll map slack_id or id to sub
		name: string;
		email: string;
		slack_id?: string;
	}> {
		const response = await axios.get(this.userInfoUrl, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const data = response.data;
		console.info('[HackClubAuthClient] Raw response:', JSON.stringify(data));

		const identity = data.identity || data;

		const result = {
			sub: identity.slack_id || identity.id,
			name: identity.name || identity.display_name || identity.username || identity.slack_id,
			email: identity.primary_email || identity.email,
			slack_id: identity.slack_id,
		};
		console.info('[HackClubAuthClient] Mapped user info:', JSON.stringify(result));
		return result;
	}
}

export const hackClubAuthClient = new HackClubAuthClient();
