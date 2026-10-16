import { Schema, model } from 'mongoose';

const tagSchema = new Schema(
  { name: { type: String, required: true, unique: true } },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'tags' },
);

export const TagModel = model('Tag', tagSchema);
