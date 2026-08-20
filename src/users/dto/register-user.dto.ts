import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterUserDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  // Lowercased here, not just in the schema: UsersService.create looks the email
  // up with findOne({ email }) before inserting, and the schema's own
  // `lowercase: true` only applies on save. Without this, "Foo@Bar.com" would
  // miss the existing "foo@bar.com" and hit the unique index as a raw E11000.
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  // 72 bytes is bcrypt's hard input limit — anything beyond it is ignored, so
  // rejecting it is honest rather than silently accepting a weaker password.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
