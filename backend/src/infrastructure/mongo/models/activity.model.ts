import { Schema, model } from 'mongoose';
import { ACTIVITY_TYPES } from '../../../contracts/index.js';

const activitySchema = new Schema(
  {
    contactId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    changes: { type: [{ _id: false, field: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed }], default: undefined },
    tag: String,
    actor: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'activities' },
);
activitySchema.index({ contactId: 1, createdAt: -1, _id: -1 });

export const ActivityModel = model('Activity', activitySchema);
