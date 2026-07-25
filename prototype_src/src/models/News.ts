import mongoose, { Schema, Document } from "mongoose";

export interface INews extends Document {
  title: string;
  summary: string;
  source: string;
  category: string;
  priority: "high" | "medium" | "low";
  audioUrl?: string;
  originalUrl: string;
  publishedAt: Date;
  expiresAt: Date; 
}

const NewsSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    source: { type: String, required: true },
    category: { type: String, default: "General" },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    audioUrl: { type: String },
    originalUrl: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

NewsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.News || mongoose.model<INews>("News", NewsSchema);