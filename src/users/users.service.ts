import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserDocument } from './schemas/user.schema';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    user: Pick<User, 'name' | 'email' | 'password'>,
  ): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      email: user.email,
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    return this.userModel.create({
      ...user,
      password: hashedPassword,
    });
  }

  // Hydrated rather than plain UserDocument: callers need `_id`, which lives on
  // the mongoose document, not on the @Schema class.
  async findByEmail(
    email: string,
  ): Promise<HydratedDocument<UserDocument> | null> {
    return this.userModel.findOne({ email });
  }
}
