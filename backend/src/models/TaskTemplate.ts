import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskTemplate extends Document {
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  recurrenceRule: 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
  customRecurrenceDays?: number; // e.g., every X days
  defaultAssignee?: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTemplateSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    priority: { 
      type: String, 
      enum: ['Low', 'Medium', 'High', 'Urgent'], 
      default: 'Medium' 
    },
    recurrenceRule: { 
      type: String, 
      enum: ['Daily', 'Weekly', 'Monthly', 'Custom'], 
      required: true 
    },
    customRecurrenceDays: { type: Number },
    defaultAssignee: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);