import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CitizenJwtAuthGuard extends AuthGuard('jwt-citizen') {}
