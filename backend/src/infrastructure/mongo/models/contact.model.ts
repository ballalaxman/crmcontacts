import { Schema, model, type InferSchemaType } from 'mongoose';

const contactSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    tags: { type: [String], default: [] },
    version: { type: Number, default: 0 },
    // Derived search/sort fields. Always computed by domain/deriveSearchFields.
    nameKeys: { type: [String], default: [] },
    sortName: { type: String, required: true },
    phoneKeys: { type: [String], default: [] },
    companyLower: { type: String },
  },
  { timestamps: true, collection: 'contacts' },
);

// Partial (not sparse): only documents whose email is a string take part in uniqueness.
contactSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } }, name: 'uniq_email' },
);
contactSchema.index({ nameKeys: 1 });
contactSchema.index({ phoneKeys: 1 });
contactSchema.index({ createdAt: -1, _id: -1 });
contactSchema.index({ sortName: 1, _id: 1 });
contactSchema.index({ tags: 1, createdAt: -1, _id: -1 });
contactSchema.index({ companyLower: 1, createdAt: -1, _id: -1 });

export type ContactDoc = InferSchemaType<typeof contactSchema>;
export const ContactModel = model('Contact', contactSchema);
